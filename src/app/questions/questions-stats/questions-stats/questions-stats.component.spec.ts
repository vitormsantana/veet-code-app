import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionsStatsComponent } from './questions-stats.component';

describe('QuestionsStatsComponent', () => {
  let component: QuestionsStatsComponent;
  let fixture: ComponentFixture<QuestionsStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuestionsStatsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionsStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
