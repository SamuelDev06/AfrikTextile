import { Component, computed, NgZone, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { Unsubscribe } from 'firebase/firestore';
import { AdminAuthService } from '../../firebase/admin-auth.service';
import { CountryCatalogueService } from '../../firebase/country-catalogue.service';
import { TextileCatalogueService } from '../../firebase/textile-catalogue.service';
import type { Country, CountryDraft } from '../../models/country';
import type { Textile, TextileDraft, TextileStatus } from '../../models/textile';

const emptyDraft: TextileDraft = {
  name: '',
  country: '',
  description: '',
  price: '',
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
    private readonly router: Router,
    private readonly zone: NgZone,
  ) {}

  protected readonly sidebarOpen = signal(false);
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
  protected readonly isSaving = signal(false);
  protected readonly isSavingCountry = signal(false);
  protected readonly isLoadingCountries = signal(true);
  protected readonly editingTextile = signal<Textile | null>(null);
  protected readonly editingCountry = signal<Country | null>(null);
  protected readonly draft = signal<TextileDraft>({ ...emptyDraft });
  protected readonly countryDraft = signal<CountryDraft>({ name: '', flag: '' });
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly imagePreviewUrl = signal<string | null>(null);
  protected readonly imagePreview = computed(
    () => this.imagePreviewUrl() ?? this.editingTextile()?.imageUrl ?? '',
  );
  private objectUrl: string | null = null;
  private unsubscribeTextiles: Unsubscribe | null = null;
  private unsubscribeCountries: Unsubscribe | null = null;
  protected readonly countries = signal<Country[]>([]);

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
    this.unsubscribeTextiles?.();
    this.unsubscribeCountries?.();
    this.releaseObjectUrl();
  }

  protected openCreateCountry(dialog: HTMLDialogElement): void {
    this.resetCountryForm();
    dialog.showModal();
  }

  protected openEditCountry(country: Country, dialog: HTMLDialogElement): void {
    this.resetCountryForm();
    this.editingCountry.set(country);
    this.countryDraft.set({ name: country.name, flag: country.flag });
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
    this.countryFormError.set('');
  }

  protected updateCountryField(field: keyof CountryDraft, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.countryDraft.update((draft) => ({ ...draft, [field]: value }));
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
    if (!draft.name.trim() || !draft.flag.trim()) {
      this.countryFormError.set('Renseigne le nom du pays et son drapeau.');
      return;
    }

    this.isSavingCountry.set(true);
    try {
      await this.countryCatalogue.saveCountry(
        { name: draft.name.trim(), flag: draft.flag.trim() },
        this.editingCountry()?.id,
      );
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
      } else {
        this.countryFormError.set('Enregistrement impossible. Vérifie les règles Firestore et réessaie.');
      }
    } finally {
      this.isSavingCountry.set(false);
    }
  }

  protected async deleteCountry(country: Country): Promise<void> {
    const textileCount = this.countryTextileCount(country);
    if (textileCount > 0) {
      this.countryError.set('Ce pays est utilisé par un ou plusieurs tissus et ne peut pas être supprimé.');
      return;
    }
    if (!window.confirm(`Supprimer « ${country.name} » de la liste des pays ?`)) {
      return;
    }

    this.countryError.set('');
    this.notification.set('');
    try {
      await this.countryCatalogue.deleteCountry(country);
      this.notification.set('Pays supprimé avec succès.');
    } catch (error) {
      console.error('Impossible de supprimer le pays.', error);
      this.countryError.set(
        error instanceof Error && error.message === 'COUNTRY_IN_USE'
          ? 'Ce pays est utilisé par un ou plusieurs tissus et ne peut pas être supprimé.'
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

  protected updateTextField(field: 'name' | 'country' | 'description' | 'price', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    this.draft.update((draft) => ({ ...draft, [field]: value }));
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

  protected selectImage(event: Event): void {
    this.formError.set('');
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.formError.set('Choisis une image JPG, PNG ou WebP de 5 Mo maximum.');
      input.value = '';
      return;
    }

    this.selectedImage.set(file);
    this.releaseObjectUrl();
    this.objectUrl = URL.createObjectURL(file);
    this.imagePreviewUrl.set(this.objectUrl);
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
    this.draft.set({
      name: textile.name,
      country: textile.country,
      description: textile.description,
      price: textile.price,
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

  protected resetForm(): void {
    this.releaseObjectUrl();
    this.imagePreviewUrl.set(null);
    this.selectedImage.set(null);
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
      (!editingTextile && !this.selectedImage())
    ) {
      this.formError.set('Renseigne tous les champs et ajoute une image pour le tissu.');
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
        this.selectedImage(),
      );
      this.notification.set(
        cleanupWarning
          ? 'Tissu enregistré, mais l’ancienne image n’a pas pu être supprimée.'
          : editingTextile
            ? 'Tissu modifié avec succès.'
            : 'Tissu ajouté avec succès.',
      );
      dialog.close();
    } catch (error) {
      console.error('Impossible d’enregistrer le tissu.', error);
      this.formError.set(
        error instanceof Error && error.message === 'IMAGE_INVALID'
          ? 'Choisis une image JPG, PNG ou WebP de 5 Mo maximum.'
          : 'Enregistrement impossible. Vérifie les règles Firestore et Storage, puis réessaie.',
      );
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
          ? 'Tissu supprimé, mais son image n’a pas pu être supprimée.'
          : 'Tissu supprimé du catalogue.',
      );
    } catch (error) {
      console.error('Impossible de supprimer le tissu.', error);
      this.dataError.set('La suppression a échoué. Vérifie les règles Firestore et réessaie.');
    }
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
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

  private releaseObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
