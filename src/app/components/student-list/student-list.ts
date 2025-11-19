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
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Failed to load students';
        this.loading = false;
      }
    });
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
}