import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentRegistration } from './components/student-registration/student-registration';
import { StudentList } from './components/student-list/student-list';

const routes: Routes = [
  { path: '', redirectTo: '/register', pathMatch: 'full' },
  { path: 'register', component: StudentRegistration },
  { path: 'students', component: StudentList }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
