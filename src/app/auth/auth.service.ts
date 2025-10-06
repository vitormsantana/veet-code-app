import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool
} from 'amazon-cognito-identity-js';
import { cognitoConfig } from './cognito.config';

interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export interface AuthSession {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: number;
  profile?: AuthProfile;
}

export interface AuthProfile {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly http: HttpClient) {}
  private readonly userPool = new CognitoUserPool({
    UserPoolId: cognitoConfig.userPoolId,
    ClientId: cognitoConfig.clientId
  });
  private readonly storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.sessionStorage;
  private readonly codeVerifierKey = 'cognito.pkce.codeVerifier';
  private readonly stateKey = 'cognito.oauth.state';
  private readonly sessionKey = 'cognito.session';

  signInWithEmail(email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password
      });

      const user = new CognitoUser({
        Username: email,
        Pool: this.userPool
      });

      user.authenticateUser(authenticationDetails, {
        onSuccess: () => resolve(),
        onFailure: (err) => reject(err)
      });
    });
  }

  async signInWithGoogle(): Promise<void> {
    const state = this.generateRandomString(32);
    const { codeVerifier, codeChallenge } = await this.createPkcePair();

    this.persistToSession(this.stateKey, state);
    this.persistToSession(this.codeVerifierKey, codeVerifier);

    const authorizeUrl = this.buildAuthorizeUrl('Google', {
      state,
      codeChallenge
    });
    console.info('[AuthService] Redirecting to Cognito Google sign-in', {
      authorizeUrl,
      domain: cognitoConfig.domain,
      redirectUri: cognitoConfig.redirectUri,
      clientId: cognitoConfig.clientId,
      state,
      codeChallenge
    });
    window.location.assign(authorizeUrl);
  }

  async completeAuthorizationCodeGrant(code: string, returnedState?: string | null): Promise<void> {
    const storage = this.storage;
    let storedState: string | null = null;
    if (storage) {
      storedState = storage.getItem(this.stateKey);
    }
    if (storedState) {
      if (!returnedState || storedState !== returnedState) {
        this.clearPkceArtifacts();
        throw new Error('OAuth state mismatch. Please try signing in again.');
      }
    }

    let codeVerifier: string | null = null;
    if (storage) {
      codeVerifier = storage.getItem(this.codeVerifierKey);
    }
    if (!codeVerifier) {
      throw new Error('Missing PKCE verifier. Please start the sign-in process again.');
    }

    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('client_id', cognitoConfig.clientId)
      .set('redirect_uri', cognitoConfig.redirectUri)
      .set('code', code)
      .set('code_verifier', codeVerifier);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    console.info('[AuthService] Exchanging authorization code for tokens');

    const tokenEndpoint = `${cognitoConfig.domain}/oauth2/token`;
    const response = await firstValueFrom(
      this.http.post<TokenResponse>(tokenEndpoint, body.toString(), { headers })
    ).catch(async (error) => {
      this.clearPkceArtifacts();
      console.error('[AuthService] Token exchange failed', error);
      throw error;
    });

    this.persistSession(response);
    this.clearPkceArtifacts();

    console.info('[AuthService] Token exchange successful');
  }

  signOut(): void {
    this.clearSession();
    const logoutUrl = `${cognitoConfig.domain}/logout?client_id=${cognitoConfig.clientId}` +
      `&logout_uri=${encodeURIComponent(cognitoConfig.logoutUri)}`;
    window.location.assign(logoutUrl);
  }

  getSession(): AuthSession | null {
    const storage = this.storage;
    let raw: string | null = null;
    if (storage) {
      raw = storage.getItem(this.sessionKey);
    }
    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as AuthSession;
      if (!session.profile) {
        session.profile = this.decodeIdToken(session.idToken);
        this.persistToSession(this.sessionKey, JSON.stringify(session));
      }
      return session;
    } catch (error) {
      console.warn('[AuthService] Unable to parse stored session', error);
      if (storage) {
        storage.removeItem(this.sessionKey);
      }
      return null;
    }
  }

  private buildAuthorizeUrl(identityProvider?: string, extras: { state?: string; codeChallenge?: string } = {}): string {
    const baseUrl = `${cognitoConfig.domain}/oauth2/authorize`;
    const params = new URLSearchParams({
      client_id: cognitoConfig.clientId,
      response_type: 'code',
      redirect_uri: cognitoConfig.redirectUri,
      scope: cognitoConfig.scope.join(' ')
    });

    if (identityProvider) {
      params.append('identity_provider', identityProvider);
    }

    if (extras.state) {
      params.append('state', extras.state);
    }

    if (extras.codeChallenge) {
      params.append('code_challenge', extras.codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    const url = `${baseUrl}?${params.toString()}`;
    console.debug('[AuthService] Built authorize URL', {
      baseUrl,
      params: params.toString(),
      identityProvider,
      extras,
      url
    });
    return url;
  }

  private persistToSession(key: string, value: string): void {
    const storage = this.storage;
    if (!storage) {
      return;
    }

    try {
      storage.setItem(key, value);
    } catch (error) {
      console.warn('[AuthService] Unable to persist value to sessionStorage', { key, error });
    }
  }

  private generateRandomString(length = 96): string {
    if (typeof window === 'undefined' || !window.crypto) {
      throw new Error('Crypto API is not available in this environment.');
    }

    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    let result = '';
    randomValues.forEach((value) => {
      result += charset[value % charset.length];
    });
    return result;
  }

  private async createPkcePair(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = this.generateRandomString(96);
    const codeChallenge = await this.createCodeChallenge(codeVerifier);
    return { codeVerifier, codeChallenge };
  }

  private async createCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(digest));
  }

  private base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((value) => {
      binary += String.fromCharCode(value);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private clearPkceArtifacts(): void {
    const storage = this.storage;
    if (!storage) {
      return;
    }

    storage.removeItem(this.codeVerifierKey);
    storage.removeItem(this.stateKey);
  }

  private persistSession(tokenResponse: TokenResponse): void {
    const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
    const session: AuthSession = {
      accessToken: tokenResponse.access_token,
      idToken: tokenResponse.id_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: tokenResponse.token_type,
      expiresAt,
      profile: this.decodeIdToken(tokenResponse.id_token)
    };
    this.persistToSession(this.sessionKey, JSON.stringify(session));
  }

  private clearSession(): void {
    const storage = this.storage;
    if (storage) {
      storage.removeItem(this.sessionKey);
    }
  }

  private decodeIdToken(idToken: string): AuthProfile | undefined {
    if (!idToken) {
      return undefined;
    }

    const parts = idToken.split('.');
    if (parts.length !== 3) {
      console.warn('[AuthService] Unexpected ID token format');
      return undefined;
    }

    try {
      const payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const decoded = atob(payload);
      return JSON.parse(decoded) as AuthProfile;
    } catch (error) {
      console.warn('[AuthService] Failed to decode ID token', error);
      return undefined;
    }
  }
}
