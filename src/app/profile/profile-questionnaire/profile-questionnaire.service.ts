import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProfileQuestionnairePayload {
  user_id: string;
  target_company: string;
  desired_role: string;
  desired_level: string;
  years_of_experience: number;
  main_stack: string;
  leetcode_experience: string;
  interview_experience: string;
  country_target: string;
  scheduled_interview: string;
  topics_familiarity: string;
  profile_last_updated: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileQuestionnaireService {
  private readonly baseUrl = `${environment.apiBaseUrl}/create_user_profile`;
  private readonly readProfileUrl = 'https://29nac9o231.execute-api.sa-east-1.amazonaws.com/dev/read_user_profile';

  constructor(private readonly http: HttpClient) {}

  fetchProfile(): Observable<ProfileQuestionnairePayload> {
    return this.http.get<ProfileQuestionnairePayload>(this.readProfileUrl); 
  }

  saveProfile(payload: ProfileQuestionnairePayload): Observable<ProfileQuestionnairePayload> {
    return this.http.post<ProfileQuestionnairePayload>(this.baseUrl, payload);
  }
}
