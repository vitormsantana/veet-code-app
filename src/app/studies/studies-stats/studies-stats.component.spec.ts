import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudiesStatsComponent } from './studies-stats.component';

describe('StudiesStatsComponent', () => {
  let component: StudiesStatsComponent;
  let fixture: ComponentFixture<StudiesStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StudiesStatsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudiesStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
