import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudiesPageComponent } from './studies-page.component';

describe('StudiesPageComponent', () => {
  let component: StudiesPageComponent;
  let fixture: ComponentFixture<StudiesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StudiesPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudiesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
