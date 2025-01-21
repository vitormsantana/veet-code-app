import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionsPageComponent } from './questions/questions-page/questions-page.component';
import { StudyComponent } from './studies/study/study.component';
import { StudiesPageComponent } from './studies/studies-page/studies-page.component';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'questions', component: QuestionsPageComponent },
  { path: 'studies', component: StudiesPageComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
