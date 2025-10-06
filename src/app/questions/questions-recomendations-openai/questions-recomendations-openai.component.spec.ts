import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionsRecomendationsOpenaiComponent } from './questions-recomendations-openai.component';

describe('QuestionsRecomendationsOpenaiComponent', () => {
  let component: QuestionsRecomendationsOpenaiComponent;
  let fixture: ComponentFixture<QuestionsRecomendationsOpenaiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuestionsRecomendationsOpenaiComponent]
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
