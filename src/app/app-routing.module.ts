import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionsPageComponent } from './questions/questions-page/questions-page.component';
import { StudiesPageComponent } from './studies/studies-page/studies-page.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { AuthGuard } from './auth/auth.guard';
import { FuturisticLandingComponent } from './landing/futuristic-landing/futuristic-landing.component';
import { ProfileQuestionnaireComponent } from './profile/profile-questionnaire/profile-questionnaire.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'landing', component: FuturisticLandingComponent },
  { path: 'questions', component: QuestionsPageComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileQuestionnaireComponent, canActivate: [AuthGuard] },
  { path: 'studies', component: StudiesPageComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
