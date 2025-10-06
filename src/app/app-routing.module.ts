import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionsPageComponent } from './questions/questions-page/questions-page.component';
import { StudyComponent } from './studies/study/study.component';
import { StudiesPageComponent } from './studies/studies-page/studies-page.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { AuthGuard } from './auth/auth.guard';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'questions', component: QuestionsPageComponent, canActivate: [AuthGuard] },
  { path: 'studies', component: StudiesPageComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
