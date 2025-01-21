import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudiesTableComponent } from './studies-table.component';

describe('StudiesTableComponent', () => {
  let component: StudiesTableComponent;
  let fixture: ComponentFixture<StudiesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StudiesTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudiesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
