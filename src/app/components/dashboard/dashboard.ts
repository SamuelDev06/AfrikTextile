import { Component, computed, NgZone, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { Subscription } from 'rxjs';
import type { Unsubscribe } from 'firebase/firestore';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { AdminAuthService } from '../../firebase/admin-auth.service';
import { CountryCatalogueService } from '../../firebase/country-catalogue.service';
import { TextileCatalogueService } from '../../firebase/textile-catalogue.service';
import { compressImage } from '../../utils/compress-image';
import type { Country, CountryDraft } from '../../models/country';
import { firebaseApp } from '../../firebase/firebase-app';
import type { Textile, TextileDraft, TextileImage, TextileImagesDraft, TextileStatus } from '../../models/textile';

const maxTextileImages = 5;
const maxImageSize = 5 * 1024 * 1024;
const usdPerEur = 1.08;
const cfaPerEur = 655.957;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const emptyDraft: TextileDraft = {
  name: '',
  country: '',
  description: '',
  price: '',
  priceUsd: '',
  status: 'available',
  featured: false,
};

const textileStatuses: TextileStatus[] = ['available', 'low-stock', 'out-of-stock'];

function isTextileStatus(value: string): value is TextileStatus {
  return textileStatuses.some((status) => status === value);
}

@Component({
  imports: [RouterLink],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit, OnDestroy {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly countryCatalogue: CountryCatalogueService,
    private readonly catalogue: TextileCatalogueService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly zone: NgZone,
  ) {}

  protected readonly activeSection = signal<'overview' | 'textiles' | 'countries'>('overview');
  protected readonly searchTerm = signal('');
  protected readonly selectedCountry = signal('');
  protected readonly selectedStatus = signal('');
  protected readonly textiles = signal<Textile[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly dataError = signal('');
  protected readonly countryError = signal('');
  protected readonly notification = signal('');
  protected readonly countryFormError = signal('');
  protected readonly formError = signal('');
  protected readonly profilePhotoError = signal('');
  protected readonly isSaving = signal(false);
  protected readonly isSavingCountry = signal(false);
  protected readonly isUploadingProfilePhoto = signal(false);
  protected readonly isLoadingCountries = signal(true);
  protected readonly profilePhotoUrl = signal<string | null>(null);
  protected readonly editingTextile = signal<Textile | null>(null);
  protected readonly editingCountry = signal<Country | null>(null);
  protected readonly draft = signal<TextileDraft>({ ...emptyDraft });
  protected readonly countryDraft = signal<CountryDraft>({ name: '', flag: '' });
  protected readonly countryFlagPreview = signal<string | null>(null);
  private selectedCountryFlag: File | null = null;
  private countryFlagObjectUrl: string | null = null;
  protected readonly currentImages = signal<TextileImage[]>([]);
  protected readonly selectedCoverImage = signal<File | null>(null);
  protected readonly selectedGalleryImages = signal<File[]>([]);
  protected readonly coverPreviewUrl = signal<string | null>(null);
  protected readonly galleryPreviewUrls = signal<string[]>([]);
  protected readonly galleryImages = computed(() => {
    const images = this.currentImages();
    const coverFile = this.selectedCoverImage();
    if (coverFile) {
      const originalCoverPath = this.editingTextile()?.images[0]?.path;
      return images
        .map((image, index) => ({ image, index }))
        .filter(({ image }) => !originalCoverPath || image.path !== originalCoverPath);
    }
    return images.slice(1).map((image, index) => ({ image, index: index + 1 }));
  });
  protected readonly imagePreview = computed(
    () => this.coverPreviewUrl() ?? this.currentImages()[0]?.url ?? '',
  );
  protected readonly imageCount = computed(() => {
    const coverCount = this.selectedCoverImage() || this.currentImages().length > 0 ? 1 : 0;
    return coverCount + this.galleryImages().length + this.selectedGalleryImages().length;
  });
  private coverObjectUrl: string | null = null;
  private galleryObjectUrls: string[] = [];
  private unsubscribeTextiles: Unsubscribe | null = null;
  private unsubscribeCountries: Unsubscribe | null = null;
  protected readonly countries = signal<Country[]>([]);
  protected readonly pageTitle = computed(() => {
    switch (this.activeSection()) {
      case 'textiles':
        return 'Gestion des tissus';
      case 'countries':
        return 'Gestion des pays';
      default:
        return 'Tableau de bord';
    }
  });
  protected readonly pageDescription = computed(() => {
    switch (this.activeSection()) {
      case 'textiles':
        return 'Consultez et gérez les tissus du catalogue.';
      case 'countries':
        return 'Consultez et gérez les pays d’origine.';
      default:
        return 'Bienvenue dans votre espace d’administration.';
    }
  });
  private routeDataSubscription: Subscription | null = null;

  protected readonly stats = computed(() => {
    const textiles = this.textiles();
    return {
      total: textiles.length,
      countries: new Set(textiles.map((textile) => textile.country)).size,
      available: textiles.filter((textile) => textile.status === 'available').length,
      outOfStock: textiles.filter((textile) => textile.status === 'out-of-stock').length,
    };
  });

  protected readonly filteredTextiles = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase('fr');
    const country = this.selectedCountry();
    const status = this.selectedStatus();

    return this.textiles().filter((textile) => {
      const matchesSearch =
        !search ||
        `${textile.name} ${textile.country} ${textile.description}`
          .toLocaleLowerCase('fr')
          .includes(search);

      return (
        matchesSearch &&
        (!country || textile.country === country) &&
        (!status || textile.status === status)
      );
    });
  });

  protected readonly countryCounts = computed(() =>
    this.countries().map((country) => ({
      ...country,
      count: this.textiles().filter((textile) => textile.country === country.name).length,
    })),
  );

  ngOnInit(): void {
    this.routeDataSubscription = this.route.data.subscribe((data) => {
      const section = data['section'];
      this.activeSection.set(section === 'textiles' || section === 'countries' ? section : 'overview');
    });
    this.profilePhotoUrl.set(this.auth.currentUser?.photoURL ?? null);
    this.unsubscribeCountries = this.countryCatalogue.watchCountries(
      (countries) =>
        this.zone.run(() => {
          this.countries.set(countries);
          this.isLoadingCountries.set(false);
          this.countryError.set('');
        }),
      (error) =>
        this.zone.run(() => {
          console.error('Impossible de charger les pays dans le dashboard.', error);
          this.countryError.set('Les pays n’ont pas pu être chargés. Vérifie la connexion à Firestore.');
          this.isLoadingCountries.set(false);
        }),
    );
    this.unsubscribeTextiles = this.catalogue.watchTextiles(
      (textiles) =>
        this.zone.run(() => {
          this.textiles.set(textiles);
          this.isLoading.set(false);
          this.dataError.set('');
        }),
      (error) =>
        this.zone.run(() => {
          console.error('Impossible de charger le catalogue dans le dashboard.', error);
          this.dataError.set('Le catalogue n’a pas pu être chargé. Vérifie la connexion à Firestore.');
          this.isLoading.set(false);
        }),
    );
  }

  ngOnDestroy(): void {
    this.routeDataSubscription?.unsubscribe();
    this.unsubscribeTextiles?.();
    this.unsubscribeCountries?.();
    this.releaseImagePreviews();
    if (this.countryFlagObjectUrl) URL.revokeObjectURL(this.countryFlagObjectUrl);
  }

  protected openCreateCountry(dialog: HTMLDialogElement): void {
    this.resetCountryForm();
    dialog.showModal();
  }

  protected openEditCountry(country: Country, dialog: HTMLDialogElement): void {
    this.resetCountryForm();
    this.editingCountry.set(country);
    this.countryDraft.set({ name: country.name, flag: country.flag });
    this.countryFlagPreview.set(country.flagUrl ?? null);
    dialog.showModal();
  }

  protected closeCountryForm(dialog: HTMLDialogElement): void {
    if (!this.isSavingCountry()) {
      dialog.close();
    }
  }

  protected resetCountryForm(): void {
    this.editingCountry.set(null);
    this.countryDraft.set({ name: '', flag: '' });
    this.selectedCountryFlag = null;
    if (this.countryFlagObjectUrl) URL.revokeObjectURL(this.countryFlagObjectUrl);
    this.countryFlagObjectUrl = null;
    this.countryFlagPreview.set(null);
    this.countryFormError.set('');
  }

  protected updateCountryField(field: keyof CountryDraft, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.countryDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  protected selectCountryFlag(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      this.countryFormError.set('Choisis une image JPG, PNG ou WebP de 2 Mo maximum.');
      return;
    }
    if (this.countryFlagObjectUrl) URL.revokeObjectURL(this.countryFlagObjectUrl);
    this.selectedCountryFlag = file;
    this.countryFlagObjectUrl = URL.createObjectURL(file);
    this.countryFlagPreview.set(this.countryFlagObjectUrl);
  }

  protected countryTextileCount(country: Country): number {
    return this.textiles().filter((textile) => textile.country === country.name).length;
  }

  protected countryNameLocked(): boolean {
    const country = this.editingCountry();
    return country !== null && this.countryTextileCount(country) > 0;
  }

  protected async saveCountry(event: SubmitEvent, dialog: HTMLDialogElement): Promise<void> {
    event.preventDefault();
    this.countryFormError.set('');
    const draft = this.countryDraft();
    if (!draft.name.trim() || (!this.editingCountry()?.flagUrl && !this.selectedCountryFlag)) {
      this.countryFormError.set('Renseigne le nom du pays et ajoute son image de drapeau.');
      return;
    }

    this.isSavingCountry.set(true);
    try {
      const id = this.editingCountry()?.id;
      let flagUrl = this.editingCountry()?.flagUrl ?? '';
      if (this.selectedCountryFlag) {
        const compressedFlag = await compressImage(this.selectedCountryFlag, 640);
        const storage = getStorage(firebaseApp);
        const imageRef = ref(storage, `countries/${id ?? crypto.randomUUID()}/flag-${Date.now()}`);
        await uploadBytes(imageRef, compressedFlag, { contentType: compressedFlag.type });
        flagUrl = await getDownloadURL(imageRef);
      }
      await this.countryCatalogue.saveCountry({ name: draft.name.trim(), flag: draft.flag, flagUrl }, id);
      this.notification.set(
        this.editingCountry() ? 'Pays modifié avec succès.' : 'Pays ajouté avec succès.',
      );
      dialog.close();
    } catch (error) {
      console.error('Impossible d’enregistrer le pays.', error);
      if (error instanceof Error && error.message === 'COUNTRY_ALREADY_EXISTS') {
        this.countryFormError.set('Ce pays est déjà présent dans la liste.');
      } else if (error instanceof Error && error.message === 'COUNTRY_IN_USE') {
        this.countryFormError.set('Le nom ne peut pas être modifié tant que des tissus utilisent ce pays.');
      } else if (error instanceof Error && error.message === 'IMAGE_PROCESSING_FAILED') {
        this.countryFormError.set('Le drapeau n’a pas pu être optimisé. Essaie avec une autre image.');
      } else {
        this.countryFormError.set('Enregistrement impossible. Vérifie les règles Firestore et réessaie.');
      }
    } finally {
      this.isSavingCountry.set(false);
    }
  }

  protected async deleteCountry(country: Country): Promise<void> {
    const textileCount = this.countryTextileCount(country);
    const cascadeWarning =
      textileCount > 0
        ? ` Cette action supprimera aussi ${textileCount} tissu${textileCount > 1 ? 's' : ''} du catalogue et de toute sélection.`
        : ' Les éventuels tissus associés seront également supprimés.';
    if (!window.confirm(`Supprimer « ${country.name} » de la liste des pays ?${cascadeWarning}`)) {
      return;
    }

    this.countryError.set('');
    this.notification.set('');
    let deletedTextileCount = 0;
    try {
      const result = await this.catalogue.deleteTextilesByCountry(country.name);
      deletedTextileCount = result.deletedCount;
      await this.countryCatalogue.deleteCountry(country);
      const textileMessage =
        deletedTextileCount > 0
          ? ` et ${deletedTextileCount} tissu${deletedTextileCount > 1 ? 's' : ''}`
          : '';
      this.notification.set(
        result.imageCleanupWarning
          ? `Pays${textileMessage} supprimé${deletedTextileCount > 0 ? 's' : ''}, mais certaines images n’ont pas pu être supprimées.`
          : `Pays${textileMessage} supprimé${deletedTextileCount > 0 ? 's' : ''} du catalogue.`,
      );
    } catch (error) {
      console.error('Impossible de supprimer le pays.', error);
      this.countryError.set(
        error instanceof Error && error.message === 'COUNTRY_IN_USE'
          ? 'Un tissu est encore associé à ce pays. Actualise le dashboard puis réessaie.'
          : deletedTextileCount > 0
            ? `${deletedTextileCount} tissu${deletedTextileCount > 1 ? 's ont' : ' a'} été supprimé${deletedTextileCount > 1 ? 's' : ''}, mais le pays n’a pas pu être supprimé. Réessaie.`
            : 'La suppression a échoué. Vérifie les règles Firestore et réessaie.',
      );
    }
  }

  protected async addInitialCountries(): Promise<void> {
    this.countryError.set('');
    try {
      await this.countryCatalogue.addInitialCountries();
      this.notification.set('La liste initiale des pays a été ajoutée.');
    } catch (error) {
      console.error('Impossible d’ajouter la liste initiale des pays.', error);
      this.countryError.set('La liste a changé. Actualise les pays puis réessaie.');
    }
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateCountry(event: Event): void {
    this.selectedCountry.set((event.target as HTMLSelectElement).value);
  }

  protected updateStatus(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
  }

  protected updateTextField(field: 'name' | 'country' | 'description' | 'price' | 'priceUsd', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    this.draft.update((draft) => {
      if (field === 'price') {
        const cfa = Number(value.replace(/[\s.,]/g, ''));
        const priceUsd = value.trim() && Number.isFinite(cfa) && cfa > 0
          ? ((cfa / cfaPerEur) * usdPerEur).toFixed(2)
          : '';
        return { ...draft, price: value, priceUsd };
      }
      return { ...draft, [field]: value };
    });
  }

  protected updateDraftStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (isTextileStatus(value)) {
      this.draft.update((draft) => ({ ...draft, status: value }));
    }
  }

  protected updateFeatured(event: Event): void {
    this.draft.update((draft) => ({
      ...draft,
      featured: (event.target as HTMLInputElement).checked,
    }));
  }

  protected selectCoverImage(event: Event): void {
    this.formError.set('');
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!this.isValidImage(file)) {
      this.formError.set('Choisis une image JPG, PNG ou WebP de 5 Mo maximum.');
      input.value = '';
      return;
    }

    this.selectedCoverImage.set(file);
    this.releaseCoverPreview();
    this.coverObjectUrl = URL.createObjectURL(file);
    this.coverPreviewUrl.set(this.coverObjectUrl);
  }

  protected selectGalleryImages(event: Event): void {
    this.formError.set('');
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      return;
    }

    if (files.some((file) => !this.isValidImage(file))) {
      this.formError.set('Choisis des images JPG, PNG ou WebP de 5 Mo maximum chacune.');
      input.value = '';
      return;
    }
    if (this.imageCount() + files.length > maxTextileImages) {
      this.formError.set(`Un tissu peut contenir ${maxTextileImages} photos au maximum.`);
      input.value = '';
      return;
    }

    this.selectedGalleryImages.update((selected) => [...selected, ...files]);
    this.galleryPreviewUrls.update((urls) => [
      ...urls,
      ...files.map((file) => {
        const url = URL.createObjectURL(file);
        this.galleryObjectUrls.push(url);
        return url;
      }),
    ]);
    input.value = '';
  }

  protected makeCoverImage(index: number): void {
    this.currentImages.update((images) => {
      const cover = images[index];
      return cover ? [cover, ...images.filter((_, imageIndex) => imageIndex !== index)] : images;
    });
  }

  protected removeSavedImage(index: number): void {
    this.currentImages.update((images) => images.filter((_, imageIndex) => imageIndex !== index));
  }

  protected removeGalleryImage(index: number): void {
    const objectUrl = this.galleryObjectUrls[index];
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      this.galleryObjectUrls.splice(index, 1);
    }
    this.selectedGalleryImages.update((images) => images.filter((_, imageIndex) => imageIndex !== index));
    this.galleryPreviewUrls.update((urls) => urls.filter((_, imageIndex) => imageIndex !== index));
  }

  protected async selectProfilePhoto(event: Event): Promise<void> {
    this.profilePhotoError.set('');
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.isUploadingProfilePhoto.set(true);
    try {
      const result = await this.auth.updateProfilePhoto(file);
      this.profilePhotoUrl.set(result.url);
      this.notification.set(
        result.cleanupWarning
          ? 'Photo de profil mise à jour, mais l’ancienne image n’a pas pu être supprimée.'
          : 'Photo de profil mise à jour.',
      );
    } catch (error) {
      console.error('Impossible de mettre à jour la photo de profil.', error);
      this.profilePhotoError.set(
        error instanceof Error && error.message === 'PROFILE_IMAGE_INVALID'
          ? 'Choisis une image JPG, PNG ou WebP de 5 Mo maximum.'
          : error instanceof Error && error.message === 'IMAGE_PROCESSING_FAILED'
            ? 'La photo n’a pas pu être optimisée. Essaie avec une autre image.'
          : 'La photo n’a pas pu être enregistrée. Vérifie que Firebase Storage est activé et réessaie.',
      );
    } finally {
      this.isUploadingProfilePhoto.set(false);
    }
  }

  protected openCreate(dialog: HTMLDialogElement): void {
    this.resetForm();
    this.editingTextile.set(null);
    this.notification.set('');
    dialog.showModal();
  }

  protected openEdit(textile: Textile, dialog: HTMLDialogElement): void {
    this.resetForm();
    this.editingTextile.set(textile);
    this.currentImages.set(textile.images);
    this.draft.set({
      name: textile.name,
      country: textile.country,
      description: textile.description,
      price: textile.price,
      priceUsd: textile.priceUsd ?? '',
      status: textile.status,
      featured: textile.featured,
    });
    dialog.showModal();
  }

  protected closeForm(dialog: HTMLDialogElement): void {
    if (!this.isSaving()) {
      dialog.close();
    }
  }

  protected resetForm(coverInput?: HTMLInputElement, galleryInput?: HTMLInputElement): void {
    this.releaseImagePreviews();
    if (coverInput) {
      coverInput.value = '';
    }
    if (galleryInput) {
      galleryInput.value = '';
    }
    this.currentImages.set([]);
    this.selectedCoverImage.set(null);
    this.selectedGalleryImages.set([]);
    this.coverPreviewUrl.set(null);
    this.galleryPreviewUrls.set([]);
    this.editingTextile.set(null);
    this.draft.set({ ...emptyDraft });
    this.formError.set('');
  }

  protected async saveTextile(event: SubmitEvent, dialog: HTMLDialogElement): Promise<void> {
    event.preventDefault();
    this.formError.set('');
    this.notification.set('');

    const draft = this.draft();
    const editingTextile = this.editingTextile();
    if (
      !draft.name.trim() ||
      !draft.country ||
      !draft.description.trim() ||
      !draft.price.trim() ||
      !draft.priceUsd.trim() ||
      (this.currentImages().length === 0 && !this.selectedCoverImage()) ||
      this.imageCount() < 2 ||
      this.imageCount() > maxTextileImages
    ) {
      this.formError.set('Renseigne tous les champs et ajoute au moins 2 photos (5 maximum).');
      return;
    }

    this.isSaving.set(true);
    try {
      const cleanupWarning = await this.catalogue.saveTextile(
        {
          ...draft,
          name: draft.name.trim(),
          country: draft.country.trim(),
          description: draft.description.trim(),
          price: draft.price.trim(),
        },
        editingTextile?.id,
        {
          coverFile: this.selectedCoverImage(),
          galleryFiles: this.selectedGalleryImages(),
          retainedImages: this.selectedCoverImage()
            ? this.galleryImages().map(({ image }) => image)
            : this.currentImages(),
        } satisfies TextileImagesDraft,
      );
      this.notification.set(
        cleanupWarning
          ? 'Tissu enregistré, mais certaines anciennes photos n’ont pas pu être supprimées.'
          : editingTextile
            ? 'Tissu modifié avec succès.'
            : 'Tissu ajouté avec succès.',
      );
      dialog.close();
    } catch (error) {
      console.error('Impossible d’enregistrer le tissu.', error);
      if (error instanceof Error && error.message === 'IMAGE_INVALID') {
        this.formError.set('Choisis des images JPG, PNG ou WebP de 5 Mo maximum chacune.');
      } else if (error instanceof Error && error.message === 'IMAGE_PROCESSING_FAILED') {
        this.formError.set('Une photo n’a pas pu être optimisée. Essaie avec une autre image.');
      } else if (error instanceof Error && error.message === 'IMAGE_COUNT_INVALID') {
        this.formError.set('Ajoute au moins 2 photos et 5 au maximum.');
      } else {
        this.formError.set('Enregistrement impossible. Vérifie les règles Firestore et Storage, puis réessaie.');
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async deleteTextile(textile: Textile): Promise<void> {
    if (!window.confirm(`Supprimer « ${textile.name} » du catalogue ?`)) {
      return;
    }

    this.notification.set('');
    try {
      const cleanupWarning = await this.catalogue.deleteTextile(textile);
      this.notification.set(
        cleanupWarning
          ? 'Tissu supprimé, mais certaines images n’ont pas pu être supprimées.'
          : 'Tissu supprimé du catalogue.',
      );
    } catch (error) {
      console.error('Impossible de supprimer le tissu.', error);
      this.dataError.set('La suppression a échoué. Vérifie les règles Firestore et réessaie.');
    }
  }

  protected async signOut(): Promise<void> {
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/admin/login');
    } catch (error) {
      console.error('Impossible de fermer la session administrateur.', error);
      this.dataError.set('La déconnexion a échoué. Réessaie.');
    }
  }

  private isValidImage(file: File): boolean {
    return allowedImageTypes.includes(file.type) && file.size <= maxImageSize;
  }

  private releaseCoverPreview(): void {
    if (this.coverObjectUrl) {
      URL.revokeObjectURL(this.coverObjectUrl);
      this.coverObjectUrl = null;
    }
    this.coverPreviewUrl.set(null);
  }

  private releaseImagePreviews(): void {
    this.releaseCoverPreview();
    for (const objectUrl of this.galleryObjectUrls) {
      URL.revokeObjectURL(objectUrl);
    }
    this.galleryObjectUrls = [];
    this.galleryPreviewUrls.set([]);
  }
}
