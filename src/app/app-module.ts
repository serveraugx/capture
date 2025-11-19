import { NgModule, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { App } from './app';
import { PhotoCapture } from './components/photo-capture/photo-capture';
import { StudentRegistration } from './components/student-registration/student-registration';
import { StudentList } from './components/student-list/student-list';
import { AppRoutingModule } from './app-routing-module';

@NgModule({
  declarations: [
    App,
    PhotoCapture,
    StudentRegistration,
    StudentList
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch())
  ],
  bootstrap: [App]
})
export class AppModule { }
