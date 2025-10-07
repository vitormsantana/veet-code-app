import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { QuestionsStatsComponent } from './questions-stats.component';
import { QuestionsStatsService, Statistics } from '../questions-stats.service';
import { QuestionsRefreshService } from '../../questions-refresh.service';

describe('QuestionsStatsComponent', () => {
  let component: QuestionsStatsComponent;
  let fixture: ComponentFixture<QuestionsStatsComponent>;
  let statsService: jasmine.SpyObj<QuestionsStatsService>;

  const mockStats: Statistics = {
    questionsCrackedPerDay: [],
    questionsCrackedPerDifficulty: {},
    questionsCrackedPerTag: {},
    totalQuestionsCracked: 0,
    incrementalQuestionsCrackedPerDay: []
  };

  beforeEach(async () => {
    statsService = jasmine.createSpyObj<QuestionsStatsService>('QuestionsStatsService', ['getStatistics']);
    statsService.getStatistics.and.returnValue(of(mockStats));

    await TestBed.configureTestingModule({
      declarations: [QuestionsStatsComponent],
      providers: [
        { provide: QuestionsStatsService, useValue: statsService },
        QuestionsRefreshService
      ],
      schemas: [NO_ERRORS_SCHEMA]
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
