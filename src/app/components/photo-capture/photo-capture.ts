import { Component, ViewChild, ElementRef, Output, EventEmitter, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface CropType {
  aspectRatio: number | null;
  label: string;
  description: string;
  maintainAspectRatio: boolean;
  targetWidth?: number;
  targetHeight?: number;
}

@Component({
  selector: 'app-photo-capture',
  standalone: false,
  templateUrl: './photo-capture.html',
  styleUrl: './photo-capture.scss',
})
export class PhotoCapture implements OnInit, OnDestroy {
  // ViewChild references
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('cropCanvas') cropCanvas!: ElementRef<HTMLCanvasElement>;
  @Output() photoCaptured = new EventEmitter<string>();

  // Camera state
  availableCameras: MediaDeviceInfo[] = [];
  selectedCameraId: string = '';
  stream: MediaStream | null = null;
  isBrowser: boolean;
  
  // Photo state
  capturedPhoto: string = '';
  originalPhoto: string = '';
  imageQuality: number = 0.7;
  cropType: string = 'passport';
  photoSizeInfo: string = '';
  
  // Crop types with dimensions (at 300 DPI for print quality)
  cropTypes: { [key: string]: CropType } = {
    passport: { 
      aspectRatio: 35 / 45,
      label: 'Passport Photo (35×45mm)',
      description: 'Standard passport photo dimensions',
      maintainAspectRatio: true,
      targetWidth: 413,   // 35mm at 300 DPI
      targetHeight: 531   // 45mm at 300 DPI
    },
    id: { 
      aspectRatio: 25 / 35,
      label: 'ID Card Photo (25×35mm)',
      description: 'ID card photo dimensions',
      maintainAspectRatio: true,
      targetWidth: 295,   // 25mm at 300 DPI
      targetHeight: 413   // 35mm at 300 DPI
    },
    custom: { 
      aspectRatio: null,
      label: 'Custom / Free Crop',
      description: 'Free-form cropping',
      maintainAspectRatio: false
    }
  };
  
  // Canvas dimensions
  canvasWidth: number = 640;
  canvasHeight: number = 480;
  displayWidth: number = 300;
  
  // Crop state
  showCropper: boolean = false;
  isCropping: boolean = false;
  cropStart: { x: number, y: number } = { x: 0, y: 0 };
  cropEnd: { x: number, y: number } = { x: 0, y: 0 };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.getCameras();
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  // Camera Management
  getCameraTypeIcon(label: string): string {
    const lower = label.toLowerCase();
    if (lower.includes('integrated') || lower.includes('built-in') || lower.includes('facetime')) return '💻';
    if (lower.includes('usb') || lower.includes('external') || lower.includes('webcam')) return '🔌';
    if (lower.includes('iriun')) return '📱';
    if (lower.includes('back') || lower.includes('rear')) return '📷';
    if (lower.includes('front')) return '🤳';
    return '📹';
  }

  getCameraType(label: string): string {
    const icon = this.getCameraTypeIcon(label);
    const types: { [key: string]: string } = {
      '💻': 'Internal Camera',
      '🔌': 'External Camera',
      '📱': 'Phone Camera',
      '📷': 'Back Camera',
      '🤳': 'Front Camera',
      '📹': 'Camera'
    };
    return `${icon} ${types[icon]}`;
  }

  getSelectedCameraLabel(): string {
    const camera = this.availableCameras.find(c => c.deviceId === this.selectedCameraId);
    return camera?.label || 'Unknown Camera';
  }

  async refreshCameras() {
    await this.getCameras();
  }

  async getCameras() {
    if (!this.isBrowser) return;
    
    try {
      // Request permission and enumerate devices
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: undefined } });
      stream.getTracks().forEach(track => track.stop());
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices.filter(d => d.kind === 'videoinput');
      
      if (this.availableCameras.length > 0) {
        this.selectedCameraId = this.availableCameras[0].deviceId;
        await this.startCamera(this.selectedCameraId);
      } else {
        alert('No cameras detected on your device.');
      }
    } catch (error: any) {
      const messages: { [key: string]: string } = {
        'NotAllowedError': 'Camera access denied. Please allow permissions.',
        'NotFoundError': 'No camera found.',
        'NotSupportedError': 'Camera not supported. Use HTTPS or localhost.'
      };
      alert(messages[error.name] || 'Unable to access camera.');
    }
  }

  async startCamera(deviceId?: string) {
    if (!this.isBrowser) return;
    
    try {
      this.stopCamera();
      
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { ideal: deviceId } } : true
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.video?.nativeElement) {
        this.video.nativeElement.srcObject = this.stream;
        await this.video.nativeElement.play();
        
        await new Promise<void>((resolve) => {
          this.video.nativeElement.onloadedmetadata = () => {
            this.canvasWidth = this.video.nativeElement.videoWidth;
            this.canvasHeight = this.video.nativeElement.videoHeight;
            this.updatePhotoInfo();
            resolve();
          };
        });
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      alert('Failed to start camera.');
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  onCameraChange(event: Event) {
    this.selectedCameraId = (event.target as HTMLSelectElement).value;
    this.startCamera(this.selectedCameraId);
  }

  // Photo Capture
  capturePhoto() {
    if (!this.video || !this.canvas) return;
    
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(this.video.nativeElement, 0, 0, this.canvasWidth, this.canvasHeight);
    this.capturedPhoto = this.canvas.nativeElement.toDataURL('image/jpeg', this.imageQuality);
    this.originalPhoto = this.capturedPhoto;
    
    if (this.cropType !== 'custom') {
      setTimeout(() => this.resizeToTarget(), 0);
    } else {
      this.updatePhotoInfo();
    }
  }

  async retakePhoto() {
    this.capturedPhoto = '';
    this.originalPhoto = '';
    this.showCropper = false;
    this.photoCaptured.emit('');
    await this.startCamera(this.selectedCameraId);
  }
  
  savePhoto() {
    this.photoCaptured.emit(this.capturedPhoto);
  }
  
  // Resize Operations
  resizeToTarget() {
    const config = this.cropTypes[this.cropType];
    if (!config.targetWidth || !config.targetHeight || !this.canvas || !this.originalPhoto) return;
    
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      this.canvas.nativeElement.width = config.targetWidth!;
      this.canvas.nativeElement.height = config.targetHeight!;
      
      const { cropX, cropY, cropWidth, cropHeight } = this.calculateCenterCrop(
        img.width, img.height, config.targetWidth!, config.targetHeight!
      );
      
      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, config.targetWidth!, config.targetHeight!);
      this.capturedPhoto = this.canvas.nativeElement.toDataURL('image/jpeg', this.imageQuality);
      this.updatePhotoInfo();
    };
    img.src = this.originalPhoto;
  }

  calculateCenterCrop(srcWidth: number, srcHeight: number, targetWidth: number, targetHeight: number) {
    const targetAspect = targetWidth / targetHeight;
    const srcAspect = srcWidth / srcHeight;
    
    let cropX = 0, cropY = 0, cropWidth = srcWidth, cropHeight = srcHeight;
    
    if (srcAspect > targetAspect) {
      // Crop sides
      cropWidth = srcHeight * targetAspect;
      cropX = (srcWidth - cropWidth) / 2;
    } else {
      // Crop top/bottom
      cropHeight = srcWidth / targetAspect;
      cropY = (srcHeight - cropHeight) / 2;
    }
    
    return { cropX, cropY, cropWidth, cropHeight };
  }
  
  // Settings
  onQualityChange() {
    this.updatePhotoInfo();
  }
  
  onCropTypeChange() {
    this.updateDimensions();
    
    if (this.capturedPhoto && !this.showCropper) {
      if (this.cropType !== 'custom') {
        this.resizeToTarget();
      } else {
        this.capturedPhoto = this.originalPhoto;
        this.updatePhotoInfo();
      }
    }
    
    if (this.showCropper) {
      this.initializeCropper();
    }
  }
  
  updateDimensions() {
    const sizes: { [key: string]: number } = { passport: 300, id: 250, custom: 500 };
    this.displayWidth = sizes[this.cropType] || 300;
    this.updatePhotoInfo();
  }
  
  updatePhotoInfo() {
    if (this.capturedPhoto && !this.showCropper) {
      const img = new Image();
      img.onload = () => {
        const size = Math.round((img.width * img.height * this.imageQuality) / 10);
        this.photoSizeInfo = `${img.width}x${img.height}px (~${size}KB)`;
      };
      img.src = this.capturedPhoto;
    } else {
      const size = Math.round((this.canvasWidth * this.canvasHeight * this.imageQuality) / 10);
      this.photoSizeInfo = `${this.canvasWidth}x${this.canvasHeight}px (~${size}KB)`;
    }
  }
  
  // Helper methods for template
  getCropTypeName(): string {
    return this.cropTypes[this.cropType]?.label || 'Unknown';
  }
  
  getCropTypeDescription(): string {
    return this.cropTypes[this.cropType]?.description || '';
  }
  
  getCropInstructions(): string {
    const config = this.cropTypes[this.cropType];
    return config?.maintainAspectRatio
      ? `Drag to select area - aspect ratio maintained for ${config.label}`
      : 'Drag to select any area - free-form cropping';
  }
  
  getPreviewClass(): string {
    return `preview-${this.cropType}`;
  }
  
  // Cropping
  openCropper() {
    this.showCropper = true;
    setTimeout(() => this.initializeCropper(), 100);
  }
  
  initializeCropper() {
    if (!this.cropCanvas || !this.capturedPhoto) return;
    
    const canvas = this.cropCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const config = this.cropTypes[this.cropType];
      const aspectRatio = config?.aspectRatio || (img.width / img.height);
      
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
    const [clientX, clientY] = event instanceof MouseEvent 
      ? [event.clientX, event.clientY]
      : [event.touches[0].clientX, event.touches[0].clientY];
    
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
    const [clientX, clientY] = event instanceof MouseEvent 
      ? [event.clientX, event.clientY]
      : [event.touches[0].clientX, event.touches[0].clientY];
    
    const scaleX = this.cropCanvas.nativeElement.width / rect.width;
    const scaleY = this.cropCanvas.nativeElement.height / rect.height;
    
    let newX = (clientX - rect.left) * scaleX;
    let newY = (clientY - rect.top) * scaleY;
    
    const config = this.cropTypes[this.cropType];
    if (config?.maintainAspectRatio && config.aspectRatio) {
      const width = Math.abs(newX - this.cropStart.x);
      const height = width / config.aspectRatio;
      newX = this.cropStart.x + (newX > this.cropStart.x ? width : -width);
      newY = this.cropStart.y + (newY > this.cropStart.y ? height : -height);
    }
    
    this.cropEnd = { x: newX, y: newY };
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
    
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const x = Math.min(this.cropStart.x, this.cropEnd.x);
      const y = Math.min(this.cropStart.y, this.cropEnd.y);
      const width = Math.abs(this.cropEnd.x - this.cropStart.x);
      const height = Math.abs(this.cropEnd.y - this.cropStart.y);
      
      ctx.clearRect(x, y, width, height);
      ctx.drawImage(img, x, y, width, height, x, y, width, height);
      
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    };
    img.src = this.originalPhoto;
  }
  
  applyCrop() {
    if (!this.cropCanvas || !this.canvas) return;
    
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    const x = Math.min(this.cropStart.x, this.cropEnd.x);
    const y = Math.min(this.cropStart.y, this.cropEnd.y);
    const width = Math.abs(this.cropEnd.x - this.cropStart.x);
    const height = Math.abs(this.cropEnd.y - this.cropStart.y);
    
    const config = this.cropTypes[this.cropType];
    const targetWidth = config.targetWidth || width;
    const targetHeight = config.targetHeight || height;
    
    this.canvas.nativeElement.width = targetWidth;
    this.canvas.nativeElement.height = targetHeight;
    
    ctx.drawImage(this.cropCanvas.nativeElement, x, y, width, height, 0, 0, targetWidth, targetHeight);
    
    this.capturedPhoto = this.canvas.nativeElement.toDataURL('image/jpeg', this.imageQuality);
    this.showCropper = false;
    this.updatePhotoInfo();
    this.photoCaptured.emit(this.capturedPhoto);
  }
  
  cancelCrop() {
    this.showCropper = false;
    this.capturedPhoto = this.originalPhoto;
  }
}
