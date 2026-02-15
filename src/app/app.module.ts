import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { QuestionComponent } from './questions/question/question.component';
import { QuestionFeedbackComponent } from './questions/question-feedback/question-feedback.component';
import { QuestionsTableComponent } from './questions/questions-table/questions-table.component';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { QuestionsStatsComponent } from './questions/questions-stats/questions-stats/questions-stats.component';
import { QuestionsStatsService } from './questions/questions-stats/questions-stats.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ChartModule } from 'primeng/chart';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { StudyComponent } from './studies/study/study.component';
import { HomeComponent } from './home/home.component';
import { QuestionsPageComponent } from './questions/questions-page/questions-page.component';
import { StudiesPageComponent } from './studies/studies-page/studies-page.component';
import { StudiesTableComponent } from './studies/studies-table/studies-table.component';
import { StudiesStatsComponent } from './studies/studies-stats/studies-stats.component';
import { RouterModule } from '@angular/router';
import { StudiesStatsPerThemeComponent } from './studies/studies-stats-per-theme/studies-stats-per-theme.component';
import { QuestionsRecomendationsOpenaiComponent } from './questions/questions-recomendations-openai/questions-recomendations-openai.component';
import { LoginComponent } from './auth/login/login.component';
import { AuthInterceptor } from './auth/auth.interceptor';
import { FuturisticLandingComponent } from './landing/futuristic-landing/futuristic-landing.component';
import { ProfileQuestionnaireComponent } from './profile/profile-questionnaire/profile-questionnaire.component';
import { MatTabsModule } from '@angular/material/tabs'; // ✅ NEW IMPORT
import { ApiEventsInterceptor } from './analytics/api-events.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    QuestionComponent,
    QuestionFeedbackComponent,
    QuestionsTableComponent,
    QuestionsStatsComponent,
    StudyComponent,
    HomeComponent,
    QuestionsPageComponent,
    StudiesPageComponent,
    StudiesTableComponent,
    StudiesStatsComponent,
    StudiesStatsPerThemeComponent,
    QuestionsRecomendationsOpenaiComponent,
    LoginComponent,
    FuturisticLandingComponent,
    ProfileQuestionnaireComponent,
  ],
  imports: [
    BrowserModule,
    ChartModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    // ✅ Material Modules
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatExpansionModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatTabsModule // ✅ add this for <mat-tab-group>
  ],
  providers: [
    provideAnimationsAsync(),
    QuestionsStatsService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiEventsInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
