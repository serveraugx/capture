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
    photoBase64: '',
    photoMetadata: undefined
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
    
    // Calculate and save metadata
    if (base64) {
      this.calculatePhotoMetadata(base64);
    }
  }

  calculatePhotoMetadata(base64: string) {
    const img = new Image();
    img.onload = () => {
      // Calculate size from base64 string
      const base64Length = base64.length - (base64.indexOf(',') + 1);
      const padding = (base64.charAt(base64.length - 2) === '=') ? 2 : 
                      (base64.charAt(base64.length - 1) === '=') ? 1 : 0;
      const sizeInBytes = (base64Length * 3 / 4) - padding;

      // Extract format from base64 header
      const formatMatch = base64.match(/data:image\/(\w+);/);
      const format = formatMatch ? formatMatch[1] : 'jpeg';

      // Extract quality from base64 (if it was encoded with quality info)
      // Estimate quality based on compression ratio
      const pixelCount = img.width * img.height;
      const bytesPerPixel = sizeInBytes / pixelCount;
      const estimatedQuality = Math.min(100, Math.round(bytesPerPixel * 100));

      this.student.photoMetadata = {
        width: img.width,
        height: img.height,
        size: Math.round(sizeInBytes),
        quality: estimatedQuality > 10 ? estimatedQuality : 70,
        format: format
      };

      console.log('Photo metadata calculated:', this.student.photoMetadata);
    };
    img.src = base64;
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
      photoBase64: '',
      photoMetadata: undefined
    };
    this.errorMessage = '';
  }

}
