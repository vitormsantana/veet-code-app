import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { QuestionComponent } from './questions/question/question.component';
import { QuestionsTableComponent } from './questions/questions-table/questions-table.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { QuestionsStatsComponent } from './questions/questions-stats/questions-stats/questions-stats.component';
import { QuestionsStatsService } from './questions/questions-stats/questions-stats.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ChartModule } from 'primeng/chart';
import { StudyComponent } from './studies/study/study.component';
import { HomeComponent } from './home/home.component';
import { QuestionsPageComponent } from './questions/questions-page/questions-page.component';
import { StudiesPageComponent } from './studies/studies-page/studies-page.component';
import { StudiesTableComponent } from './studies/studies-table/studies-table.component';
import { StudiesStatsComponent } from './studies/studies-stats/studies-stats.component';
import { RouterModule } from '@angular/router';
import { StudiesStatsPerThemeComponent } from './studies/studies-stats-per-theme/studies-stats-per-theme.component';
import { QuestionsRecomendationsOpenaiComponent } from './questions/questions-recomendations-openai/questions-recomendations-openai.component';

@NgModule({
  declarations: [
    AppComponent,
    QuestionComponent,
    QuestionsTableComponent,
    QuestionsStatsComponent,
    StudyComponent,
    HomeComponent,
    QuestionsPageComponent,
    StudiesPageComponent,
    StudiesTableComponent,
    StudiesStatsComponent,
    StudiesStatsPerThemeComponent,
    QuestionsRecomendationsOpenaiComponent
  ],
  imports: [
    BrowserModule,
    ChartModule,
    AppRoutingModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatExpansionModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSelectModule,
    ReactiveFormsModule,  ],
  providers: [
    provideAnimationsAsync(),
    QuestionsStatsService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
