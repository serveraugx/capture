import { Component, ViewChild, ElementRef, Output, EventEmitter, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-photo-capture',
  standalone: false,
  templateUrl: './photo-capture.html',
  styleUrl: './photo-capture.scss',
})
export class PhotoCapture implements OnInit, OnDestroy {

  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('cropCanvas') cropCanvas!: ElementRef<HTMLCanvasElement>;
  @Output() photoCaptured = new EventEmitter<string>();

  availableCameras: MediaDeviceInfo[] = [];
  selectedCameraId: string = '';
  capturedPhoto: string = '';
  stream: MediaStream | null = null;
  isBrowser: boolean;
  
  // Image Quality and Size Settings
  imageQuality: number = 0.7; // Default to Medium quality (70%)
  photoSize: string = 'passport'; // Default to passport size
  
  // Photo dimensions in pixels (at 300 DPI for print quality)
  photoSizes = {
    passport: { width: 413, height: 531, label: 'Passport (35x45mm)' }, // 35x45mm at 300 DPI
    id: { width: 295, height: 413, label: 'ID Card (25x35mm)' },       // 25x35mm at 300 DPI
    visa: { width: 591, height: 591, label: 'Visa (50x50mm)' },        // 50x50mm at 300 DPI
    custom: { width: 640, height: 480, label: 'Custom Size' }
  };
  
  // Display and canvas dimensions
  videoWidth: number = 640;
  videoHeight: number = 480;
  canvasWidth: number = 640;
  canvasHeight: number = 480;
  displayWidth: number = 400;
  
  // Crop functionality
  showCropper: boolean = false;
  isCropping: boolean = false;
  cropStart: { x: number, y: number } = { x: 0, y: 0 };
  cropEnd: { x: number, y: number } = { x: 0, y: 0 };
  originalPhoto: string = '';
  photoSizeInfo: string = '';
  
  // Camera settings
  selectedResolution: string = '640x480';
  resolutions = [
    { label: '320x240 (Low)', value: '320x240', width: 320, height: 240 },
    { label: '640x480 (Medium)', value: '640x480', width: 640, height: 480 },
    { label: '1280x720 (HD)', value: '1280x720', width: 1280, height: 720 },
    { label: '1920x1080 (Full HD)', value: '1920x1080', width: 1920, height: 1080 }
  ];
  
  zoomLevel: number = 1;
  minZoom: number = 1;
  maxZoom: number = 1;
  supportsZoom: boolean = false;
  
  facingMode: string = 'user';
  facingModes = [
    { label: 'Front Camera', value: 'user' },
    { label: 'Back Camera', value: 'environment' }
  ];
  
  showSettings: boolean = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.updateDimensions();
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.getCameras();
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  getCameraType(label: string): string {
    const lowerLabel = label.toLowerCase();
    
    if (lowerLabel.includes('integrated') || lowerLabel.includes('built-in') || lowerLabel.includes('facetime')) {
      return '💻 Internal Camera';
    } else if (lowerLabel.includes('usb') || lowerLabel.includes('external') || lowerLabel.includes('webcam')) {
      return '🔌 External Camera';
    } else if (lowerLabel.includes('iriun')) {
      return '📱 Phone Camera (Iriun)';
    } else if (lowerLabel.includes('back') || lowerLabel.includes('rear')) {
      return '📷 Back Camera';
    } else if (lowerLabel.includes('front')) {
      return '🤳 Front Camera';
    }
    
    // Default fallback
    return '📹 Camera';
  }

  getCameraTypeIcon(label: string): string {
    const lowerLabel = label.toLowerCase();
    
    if (lowerLabel.includes('integrated') || lowerLabel.includes('built-in') || lowerLabel.includes('facetime')) {
      return '💻';
    } else if (lowerLabel.includes('usb') || lowerLabel.includes('external') || lowerLabel.includes('webcam')) {
      return '🔌';
    } else if (lowerLabel.includes('iriun')) {
      return '📱';
    } else if (lowerLabel.includes('back') || lowerLabel.includes('rear')) {
      return '📷';
    } else if (lowerLabel.includes('front')) {
      return '🤳';
    }
    
    return '📹';
  }

  getSelectedCameraLabel(): string {
    const selectedCamera = this.availableCameras.find(camera => camera.deviceId === this.selectedCameraId);
    return selectedCamera?.label || 'Unknown Camera';
  }

  async refreshCameras() {
    await this.getCameras();
  }

  async getCameras() {
    if (!this.isBrowser) {
      return;
    }
    try {
      // First, request camera permission with aggressive enumeration
      // This helps detect all cameras including virtual ones like Iriun
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          deviceId: undefined // Don't specify device to force detection of all
        } 
      });
      
      // Stop the permission stream
      stream.getTracks().forEach(track => track.stop());
      
      // Wait a bit for device detection to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Once permission is granted, enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Detected cameras:', this.availableCameras.map(c => c.label || c.deviceId));
      
      // Start with first camera or the already running stream
      if (this.availableCameras.length > 0) {
        this.selectedCameraId = this.availableCameras[0].deviceId;
        await this.startCamera(this.selectedCameraId);
      } else {
        console.warn('No cameras found');
        if (typeof window !== 'undefined') {
          alert('No cameras detected on your device.');
        }
      }
    } catch (error: any) {
      console.error('Error accessing cameras:', error);
      
      let errorMessage = 'Unable to access camera.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions and refresh the page.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on your device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera access is not supported. Please use HTTPS or localhost.';
      }
      
      if (typeof window !== 'undefined') {
        alert(errorMessage);
      }
    }
  }

  async startCamera(deviceId?: string) {
    if (!this.isBrowser) {
      return;
    }
    try {
      this.stopCamera();
      
      // Get selected resolution
      const resolution = this.resolutions.find(r => r.value === this.selectedResolution) || this.resolutions[1];
      
      // Build constraints with resolution and facing mode
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: resolution.width },
          height: { ideal: resolution.height },
          facingMode: this.facingMode
        }
      };
      
      // Add device ID if specified
      if (deviceId && constraints.video && typeof constraints.video !== 'boolean') {
        constraints.video.deviceId = { ideal: deviceId };
      }
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Check for zoom support
      if (this.stream) {
        const videoTrack = this.stream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities() as any;
        
        if (capabilities.zoom) {
          this.supportsZoom = true;
          this.minZoom = capabilities.zoom.min || 1;
          this.maxZoom = capabilities.zoom.max || 3;
          this.zoomLevel = this.minZoom;
        } else {
          this.supportsZoom = false;
        }
      }
      
      if (this.video && this.video.nativeElement) {
        this.video.nativeElement.srcObject = this.stream;
        await this.video.nativeElement.play();
      }
    } catch (error: any) {
      console.error('Error starting camera:', error);
      
      let errorMessage = 'Failed to start camera.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions in your browser.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and refresh the page.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        // If exact device fails, try without constraints
        try {
          this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (this.video && this.video.nativeElement) {
            this.video.nativeElement.srcObject = this.stream;
            await this.video.nativeElement.play();
          }
          return; // Success with fallback
        } catch (fallbackError) {
          errorMessage = 'Selected camera not available. Please try a different camera.';
        }
      }
      
      if (typeof window !== 'undefined') {
        alert(errorMessage);
      }
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  onCameraChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedCameraId = select.value;
    this.startCamera(this.selectedCameraId);
  }

  capturePhoto() {
    if (!this.video || !this.canvas) {
      return;
    }
    const context = this.canvas.nativeElement.getContext('2d');
    if (context) {
      context.drawImage(this.video.nativeElement, 0, 0, this.canvasWidth, this.canvasHeight);
      this.capturedPhoto = this.canvas.nativeElement.toDataURL('image/jpeg', this.imageQuality);
      this.originalPhoto = this.capturedPhoto;
      this.updatePhotoInfo();
      this.photoCaptured.emit(this.capturedPhoto);
    }
  }

  async retakePhoto() {
    this.capturedPhoto = '';
    this.originalPhoto = '';
    this.showCropper = false;
    this.photoCaptured.emit('');
    // Restart the camera stream
    await this.startCamera(this.selectedCameraId);
  }
  
  savePhoto() {
    // Emit the final photo for parent component to handle
    this.photoCaptured.emit(this.capturedPhoto);
  }
  
  // Quality and Size Management
  onQualityChange() {
    this.updatePhotoInfo();
  }
  
  onSizeChange() {
    this.updateDimensions();
  }
  
  updateDimensions() {
    const size = this.photoSizes[this.photoSize as keyof typeof this.photoSizes];
    if (size) {
      this.canvasWidth = size.width;
      this.canvasHeight = size.height;
      
      // Update video to match aspect ratio
      const aspectRatio = size.width / size.height;
      this.videoHeight = 480;
      this.videoWidth = Math.round(this.videoHeight * aspectRatio);
      
      // Update display width
      this.displayWidth = Math.min(400, this.canvasWidth);
    }
    this.updatePhotoInfo();
  }
  
  updatePhotoInfo() {
    const size = this.photoSizes[this.photoSize as keyof typeof this.photoSizes];
    const estimatedSize = Math.round((this.canvasWidth * this.canvasHeight * this.imageQuality) / 10);
    this.photoSizeInfo = `${this.canvasWidth}x${this.canvasHeight}px (~${estimatedSize}KB)`;
  }
  
  getPhotoSizeName(): string {
    return this.photoSizes[this.photoSize as keyof typeof this.photoSizes]?.label || 'Unknown';
  }
  
  // Cropping Functionality
  openCropper() {
    this.showCropper = true;
    setTimeout(() => this.initializeCropper(), 100);
  }
  
  initializeCropper() {
    if (!this.cropCanvas || !this.capturedPhoto) {
      return;
    }
    
    const canvas = this.cropCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the image
      ctx?.drawImage(img, 0, 0);
      
      // Initialize crop area (center 80% of image)
      const size = this.photoSizes[this.photoSize as keyof typeof this.photoSizes];
      const aspectRatio = size.width / size.height;
      
      const cropWidth = Math.min(img.width * 0.8, img.height * 0.8 * aspectRatio);
      const cropHeight = cropWidth / aspectRatio;
      
      this.cropStart = {
        x: (img.width - cropWidth) / 2,
        y: (img.height - cropHeight) / 2
      };
      this.cropEnd = {
        x: this.cropStart.x + cropWidth,
        y: this.cropStart.y + cropHeight
      };
      
      this.drawCropOverlay();
    };
    
    img.src = this.capturedPhoto;
  }
  
  startCrop(event: MouseEvent | TouchEvent) {
    this.isCropping = true;
    const rect = this.cropCanvas.nativeElement.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }
    
    const scaleX = this.cropCanvas.nativeElement.width / rect.width;
    const scaleY = this.cropCanvas.nativeElement.height / rect.height;
    
    this.cropStart = {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
    this.cropEnd = { ...this.cropStart };
  }
  
  updateCrop(event: MouseEvent | TouchEvent) {
    if (!this.isCropping) return;
    
    event.preventDefault();
    const rect = this.cropCanvas.nativeElement.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }
    
    const scaleX = this.cropCanvas.nativeElement.width / rect.width;
    const scaleY = this.cropCanvas.nativeElement.height / rect.height;
    
    this.cropEnd = {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
    
    this.drawCropOverlay();
  }
  
  endCrop() {
    this.isCropping = false;
  }
  
  drawCropOverlay() {
    if (!this.cropCanvas) return;
    
    const canvas = this.cropCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Redraw original image
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      
      // Draw semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Clear the crop area
      const x = Math.min(this.cropStart.x, this.cropEnd.x);
      const y = Math.min(this.cropStart.y, this.cropEnd.y);
      const width = Math.abs(this.cropEnd.x - this.cropStart.x);
      const height = Math.abs(this.cropEnd.y - this.cropStart.y);
      
      ctx.clearRect(x, y, width, height);
      ctx.drawImage(img, x, y, width, height, x, y, width, height);
      
      // Draw crop rectangle border
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    };
    img.src = this.originalPhoto;
  }
  
  applyCrop() {
    if (!this.cropCanvas || !this.canvas) return;
    
    const sourceCanvas = this.cropCanvas.nativeElement;
    const destCanvas = this.canvas.nativeElement;
    const ctx = destCanvas.getContext('2d');
    if (!ctx) return;
    
    // Get crop coordinates
    const x = Math.min(this.cropStart.x, this.cropEnd.x);
    const y = Math.min(this.cropStart.y, this.cropEnd.y);
    const width = Math.abs(this.cropEnd.x - this.cropStart.x);
    const height = Math.abs(this.cropEnd.y - this.cropStart.y);
    
    // Resize destination canvas to match selected photo size
    destCanvas.width = this.canvasWidth;
    destCanvas.height = this.canvasHeight;
    
    // Draw cropped and resized image
    ctx.drawImage(sourceCanvas, x, y, width, height, 0, 0, this.canvasWidth, this.canvasHeight);
    
    // Update captured photo with cropped version
    this.capturedPhoto = destCanvas.toDataURL('image/jpeg', this.imageQuality);
    this.showCropper = false;
    this.photoCaptured.emit(this.capturedPhoto);
  }
  
  cancelCrop() {
    this.showCropper = false;
    this.capturedPhoto = this.originalPhoto;
  }

  toggleSettings() {
    this.showSettings = !this.showSettings;
  }

  async onResolutionChange() {
    await this.startCamera(this.selectedCameraId);
  }

  async onFacingModeChange() {
    // Clear device ID when switching facing mode
    this.selectedCameraId = '';
    await this.startCamera();
  }

  async applyZoom() {
    if (!this.stream || !this.supportsZoom) {
      return;
    }
    try {
      const videoTrack = this.stream.getVideoTracks()[0];
      await videoTrack.applyConstraints({
        advanced: [{ zoom: this.zoomLevel } as any]
      });
    } catch (error) {
      console.error('Error applying zoom:', error);
    }
  }
}
