import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { StudentResponse } from '../../models/student-response.model';
import { Student } from '../../services/student';

@Component({
  selector: 'app-student-list',
  standalone: false,
  templateUrl: './student-list.html',
  styleUrl: './student-list.scss',
})
export class StudentList implements OnInit {

  students: StudentResponse[] = [];
  loading = false;
  errorMessage = '';
  isBrowser: boolean;
  
  // Modal state
  selectedStudent: StudentResponse | null = null;
  isEditingPhoto: boolean = false;
  newPhotoBase64: string = '';

  constructor(
    private studentService: Student,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.loadStudents();
  }

  loadStudents() {
    this.loading = true;
    this.errorMessage = '';

    this.studentService.getAllStudents().subscribe({
      next: (res) => {
        this.students = res;
        // Calculate metadata for photos that don't have it
        this.students.forEach(student => {
          if (student.photoBase64 && !student.photoMetadata) {
            this.calculatePhotoMetadata(student);
          }
        });
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Failed to load students';
        this.loading = false;
      }
    });
  }

  calculatePhotoMetadata(student: StudentResponse) {
    if (!student.photoBase64) return;

    const img = new Image();
    img.onload = () => {
      // Calculate size from base64 string
      const base64Length = student.photoBase64.length - (student.photoBase64.indexOf(',') + 1);
      const padding = (student.photoBase64.charAt(student.photoBase64.length - 2) === '=') ? 2 : 
                      (student.photoBase64.charAt(student.photoBase64.length - 1) === '=') ? 1 : 0;
      const sizeInBytes = (base64Length * 3 / 4) - padding;

      // Extract format and quality info from base64 header
      const formatMatch = student.photoBase64.match(/data:image\/(\w+);/);
      const format = formatMatch ? formatMatch[1] : 'jpeg';

      if (!student.photoMetadata) {
        student.photoMetadata = {};
      }

      student.photoMetadata.width = img.width;
      student.photoMetadata.height = img.height;
      student.photoMetadata.size = Math.round(sizeInBytes);
      student.photoMetadata.format = format;
      
      // Estimate quality based on file size and dimensions
      const pixelCount = img.width * img.height;
      const bytesPerPixel = sizeInBytes / pixelCount;
      const estimatedQuality = Math.min(100, Math.round(bytesPerPixel * 100));
      student.photoMetadata.quality = estimatedQuality > 10 ? estimatedQuality : 70; // Default to 70 if too low
    };
    img.src = student.photoBase64;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    } else {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
  }

  getPhotoTooltip(student: StudentResponse): string {
    if (!student.photoMetadata) return 'Photo';
    
    const parts = [];
    if (student.photoMetadata.width && student.photoMetadata.height) {
      parts.push(`Resolution: ${student.photoMetadata.width}x${student.photoMetadata.height}px`);
    }
    if (student.photoMetadata.size) {
      parts.push(`Size: ${this.formatFileSize(student.photoMetadata.size)}`);
    }
    if (student.photoMetadata.quality) {
      parts.push(`Quality: ${student.photoMetadata.quality}%`);
    }
    if (student.photoMetadata.format) {
      parts.push(`Format: ${student.photoMetadata.format.toUpperCase()}`);
    }
    
    return parts.join('\n');
  }

  deleteStudent(id: number) {
    if (!this.isBrowser) {
      return;
    }
    if (!confirm('Are you sure you want to delete this student?')) {
      return;
    }

    this.studentService.deleteStudent(id).subscribe({
      next: () => {
        alert('Student deleted successfully!');
        this.loadStudents();
      },
      error: (err) => {
        console.error(err);
        alert('Failed to delete student');
      }
    });
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }
  
  viewStudent(student: StudentResponse) {
    this.selectedStudent = { ...student };
    this.isEditingPhoto = false;
    this.newPhotoBase64 = '';
  }
  
  closeModal() {
    this.selectedStudent = null;
    this.isEditingPhoto = false;
    this.newPhotoBase64 = '';
  }
  
  startPhotoEdit() {
    this.isEditingPhoto = true;
    this.newPhotoBase64 = '';
  }
  
  cancelPhotoEdit() {
    this.isEditingPhoto = false;
    this.newPhotoBase64 = '';
  }
  
  onNewPhotoCaptured(base64: string) {
    this.newPhotoBase64 = base64;
  }
  
  savePhotoChanges() {
    if (!this.selectedStudent || !this.newPhotoBase64) {
      return;
    }
    
    const updatedStudent = {
      ...this.selectedStudent,
      photoBase64: this.newPhotoBase64
    };
    
    // Calculate metadata for new photo
    this.calculatePhotoMetadata(updatedStudent);
    
    // Update student in the backend
    this.studentService.updateStudent(this.selectedStudent.id, updatedStudent).subscribe({
      next: (res) => {
        if (this.isBrowser) {
          alert('Photo updated successfully!');
        }
        this.loadStudents();
        this.closeModal();
      },
      error: (err) => {
        console.error(err);
        if (this.isBrowser) {
          alert('Failed to update photo');
        }
      }
    });
  }
}