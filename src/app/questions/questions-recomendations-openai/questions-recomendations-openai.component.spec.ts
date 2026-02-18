import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { QuestionsRecomendationsOpenaiComponent } from './questions-recomendations-openai.component';
import { QuestionsRecomendationsOpenaiService } from './questions-recomendations-openai.service';

describe('QuestionsRecomendationsOpenaiComponent', () => {
  let component: QuestionsRecomendationsOpenaiComponent;
  let fixture: ComponentFixture<QuestionsRecomendationsOpenaiComponent>;

  beforeEach(async () => {
    const recommendationsServiceSpy = jasmine.createSpyObj<QuestionsRecomendationsOpenaiService>(
      'QuestionsRecomendationsOpenaiService',
      ['getRecommendations']
    );
    recommendationsServiceSpy.getRecommendations.and.returnValue(of({ recommendations: [] }));

    await TestBed.configureTestingModule({
      declarations: [QuestionsRecomendationsOpenaiComponent],
      providers: [{ provide: QuestionsRecomendationsOpenaiService, useValue: recommendationsServiceSpy }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionsRecomendationsOpenaiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
