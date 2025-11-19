import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { StudentRequest } from '../../models/student-request.model';
import { Student } from '../../services/student';

@Component({
  selector: 'app-student-registration',
  standalone: false,
  templateUrl: './student-registration.html',
  styleUrl: './student-registration.scss',
})
export class StudentRegistration {

  student: StudentRequest = {
    fullName: '',
    studentId: '',
    className: '',
    phone: '',
    address: '',
    photoBase64: ''
  };

  loading = false;
  errorMessage = '';
  isBrowser: boolean;

  constructor(
    private studentService: Student,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  onPhotoCaptured(base64: string) {
    this.student.photoBase64 = base64;
  }

  registerStudent() {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.studentService.registerStudent(this.student).subscribe({
      next: (res) => {
        if (this.isBrowser) {
          alert('Student registered successfully!');
        }
        this.resetForm();
        this.router.navigate(['/students']);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err.error?.message || 'Registration failed! Please try again.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  validateForm(): boolean {
    if (!this.student.fullName || this.student.fullName.trim() === '') {
      this.errorMessage = 'Full name is required';
      return false;
    }
    if (!this.student.studentId || this.student.studentId.trim() === '') {
      this.errorMessage = 'Student ID is required';
      return false;
    }
    if (!this.student.photoBase64) {
      this.errorMessage = 'Please capture a photo';
      return false;
    }
    return true;
  }

  resetForm() {
    this.student = {
      fullName: '',
      studentId: '',
      className: '',
      phone: '',
      address: '',
      photoBase64: ''
    };
    this.errorMessage = '';
  }

}
