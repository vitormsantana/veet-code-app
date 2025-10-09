import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FuturisticLandingComponent } from './futuristic-landing.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('FuturisticLandingComponent', () => {
  let component: FuturisticLandingComponent;
  let fixture: ComponentFixture<FuturisticLandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FuturisticLandingComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(FuturisticLandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
