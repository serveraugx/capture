import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { StudentRequest } from '../models/student-request.model';
import { StudentResponse } from '../models/student-response.model';

@Injectable({
  providedIn: 'root',
})
export class Student {
  private students: StudentResponse[] = [
    {
      id: 1,
      fullName: 'Alice Johnson',
      studentId: 'STU001',
      className: 'Class A',
      phone: '555-0101',
      address: '123 Main St',
      photoBase64: ''
    },
    {
      id: 2,
      fullName: 'Bob Smith',
      studentId: 'STU002',
      className: 'Class B',
      phone: '555-0202',
      address: '456 Oak Ave',
      photoBase64: ''
    }
  ];

  private nextId = 3;

  registerStudent(student: StudentRequest): Observable<StudentResponse> {
    const newStudent: StudentResponse = {
      id: this.nextId++,
      ...student
    };
    this.students.push(newStudent);
    return of(newStudent);
  }

  getAllStudents(): Observable<StudentResponse[]> {
    return of([...this.students]);
  }

  getStudent(id: number): Observable<StudentResponse> {
    const found = this.students.find(s => s.id === id);
    return of(found as StudentResponse);
  }

  updateStudent(id: number, student: Partial<StudentResponse>): Observable<StudentResponse> {
    const index = this.students.findIndex(s => s.id === id);
    if (index !== -1) {
      this.students[index] = { ...this.students[index], ...student };
      return of(this.students[index]);
    }
    throw new Error('Student not found');
  }

  deleteStudent(id: number): Observable<void> {
    this.students = this.students.filter(s => s.id !== id);
    return of(void 0);
  }
}
