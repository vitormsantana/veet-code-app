import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { ProfileQuestionnairePayload, ProfileQuestionnaireService } from './profile-questionnaire.service';
import { AuthService } from '../../auth/auth.service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';


@Component({
  selector: 'app-profile-questionnaire',
  templateUrl: './profile-questionnaire.component.html',
  styleUrls: ['./profile-questionnaire.component.css'],
  standalone: false,
})
export class ProfileQuestionnaireComponent implements OnInit, OnDestroy {
  showForm = false; 
  questionnaireForm: FormGroup;
  isLoading = false;
  private readonly destroy$ = new Subject<void>();

  readonly topicsOptions = [
    'Data Structures',
    'Algorithms',
    'System Design',
    'Databases',
    'Distributed Systems',
    'Security',
    'Machine Learning',
    'Behavioral Interviews',
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly snackBar: MatSnackBar,
    private readonly profileService: ProfileQuestionnaireService,
    private readonly authService: AuthService
  ) {
    this.questionnaireForm = this.fb.group({
      user_id: [{ value: '', disabled: true }, Validators.required],
      target_company: ['', Validators.required],
      desired_role: ['', Validators.required],
      desired_level: ['', Validators.required],
      years_of_experience: [0, [Validators.required, Validators.min(0)]],
      main_stack: ['', Validators.required],
      leetcode_experience: ['', Validators.required],
      interview_experience: ['', Validators.required],
      country_target: ['', Validators.required],
      scheduled_interview: [''],
      topics_familiarity: [[]],
      profile_last_updated: [''],
    });
  }

  ngOnInit(): void {
    this.populateUserId();
    this.loadExistingProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTopic(topic: string): void {
    const current: string[] = this.questionnaireForm.get('topics_familiarity')?.value ?? [];
    if (current.includes(topic)) {
      this.questionnaireForm.patchValue({
        topics_familiarity: current.filter((item) => item !== topic),
      });
    } else {
      this.questionnaireForm.patchValue({
        topics_familiarity: [...current, topic],
      });
    }
  }

  submit(): void {
    if (this.questionnaireForm.invalid) {
      this.questionnaireForm.markAllAsTouched();
      this.snackBar.open('Please fill in the required fields before saving.', 'Dismiss', { duration: 4000 });
      return;
    }

    const payload = this.composePayload();
    this.isLoading = true;

    this.profileService
      .saveProfile(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Profile preferences saved successfully.', 'Dismiss', { duration: 3000 });
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Failed to save profile preferences. Please try again later.', 'Dismiss', { duration: 4000 });
        },
      });
  }

  private populateUserId(): void {
    const session = this.authService.getSession();
    const userId = session?.profile?.sub ?? '';
    this.questionnaireForm.patchValue({ user_id: userId });
  }

  currentProfile: ProfileQuestionnairePayload | null = null;

  private loadExistingProfile(): void {
    this.isLoading = true;
  
    this.profileService
      .fetchProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile) => {
          this.isLoading = false;
          if (profile) {
            this.currentProfile = profile;
            const { topics_familiarity, ...rest } = profile;
            this.questionnaireForm.patchValue({
              ...rest,
              topics_familiarity: this.deserializeTopics(topics_familiarity),
            });
          }
        },
        error: () => {
          this.isLoading = false;
          this.currentProfile = null;
        },
      });
  }
  

  private composePayload(): ProfileQuestionnairePayload {
    const raw = this.questionnaireForm.getRawValue();
    return {
      user_id: raw.user_id,
      target_company: raw.target_company,
      desired_role: raw.desired_role,
      desired_level: raw.desired_level,
      years_of_experience: Number(raw.years_of_experience ?? 0),
      main_stack: raw.main_stack,
      leetcode_experience: raw.leetcode_experience,
      interview_experience: raw.interview_experience,
      country_target: raw.country_target,
      scheduled_interview: raw.scheduled_interview,
      topics_familiarity: JSON.stringify(raw.topics_familiarity ?? []),
      profile_last_updated: new Date().toISOString(),
    };
  }

  public deserializeTopics(topicsFamiliarity: string | string[] | null | undefined): string[] {
    if (!topicsFamiliarity) {
      return [];
    }
    if (Array.isArray(topicsFamiliarity)) {
      return topicsFamiliarity;
    }
    try {
      const parsed = JSON.parse(topicsFamiliarity);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  isTopicSelected(topic: string): boolean {
    const topics: string[] = this.questionnaireForm.get('topics_familiarity')?.value ?? [];
    return topics.includes(topic);
  }

  predefinedcompanies = ['Amazon', 'Google', 'Microsoft', 'Meta', 'Netflix', 'Apple', 'NVIDIA', 'Uber', 'Other'];
  isOtherCompanySelected = false;

  onCompanySelectionChange(event: any): void {
    this.isOtherCompanySelected = event.value === 'Other';
  }

  toggleForm(show: boolean): void {
    this.showForm = show;
  }
}
