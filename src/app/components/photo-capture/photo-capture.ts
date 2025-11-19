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
  @Output() photoCaptured = new EventEmitter<string>();

  availableCameras: MediaDeviceInfo[] = [];
  selectedCameraId: string = '';
  capturedPhoto: string = '';
  stream: MediaStream | null = null;
  isBrowser: boolean;
  
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
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.getCameras();
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  async getCameras() {
    if (!this.isBrowser) {
      return;
    }
    try {
      // First, request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Once permission is granted, enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices.filter(device => device.kind === 'videoinput');
      
      // Stop the permission stream
      stream.getTracks().forEach(track => track.stop());
      
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
      context.drawImage(this.video.nativeElement, 0, 0, 320, 240);
      this.capturedPhoto = this.canvas.nativeElement.toDataURL('image/jpeg', 0.8);
      this.photoCaptured.emit(this.capturedPhoto);
    }
  }

  retakePhoto() {
    this.capturedPhoto = '';
    this.photoCaptured.emit('');
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
