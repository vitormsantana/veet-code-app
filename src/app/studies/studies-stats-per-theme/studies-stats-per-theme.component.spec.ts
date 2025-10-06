import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudiesStatsPerThemeComponent } from './studies-stats-per-theme.component';

describe('StudiesStatsPerThemeComponent', () => {
  let component: StudiesStatsPerThemeComponent;
  let fixture: ComponentFixture<StudiesStatsPerThemeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudiesStatsPerThemeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudiesStatsPerThemeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
