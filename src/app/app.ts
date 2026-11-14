import { Component, signal } from '@angular/core';
import { Origins } from './components/origins/origins';

@Component({
  imports: [Origins],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('AfrikTextile');
}
