import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { QuestionComponent } from './question/question.component';
import { QuestionsTableComponent } from './questions-table/questions-table.component';

import { HttpClientModule } from '@angular/common/http';

import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { QuestionsStatsComponent } from './questions-stats/questions-stats/questions-stats.component';
import { QuestionsStatsService } from './questions-stats/questions-stats.service';

import { ChartModule } from 'primeng/chart';

@NgModule({
  declarations: [
    AppComponent,
    QuestionComponent,
    QuestionsTableComponent,
    QuestionsStatsComponent
  ],
  imports: [
    BrowserModule,
    ChartModule,
    AppRoutingModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    HttpClientModule,
  ],
  providers: [
    provideAnimationsAsync(),
    QuestionsStatsService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
