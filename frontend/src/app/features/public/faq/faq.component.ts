import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatExpansionModule, 
    MatIconModule, 
    MatButtonModule,
    MatDividerModule
  ],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="text-center mb-12">
        <h1 class="text-3xl font-bold mb-4">Frequently Asked Questions</h1>
        <p class="text-strata-gray-600 dark:text-strata-gray-400 max-w-2xl mx-auto">
          Find answers to the most common questions about CodeStrata, our features, and how to get started.
        </p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <mat-card class="p-6 hover:shadow-md transition-shadow">
          <mat-icon class="text-strata-primary text-3xl mb-4">help_outline</mat-icon>
          <h2 class="text-xl font-medium mb-2">Getting Started</h2>
          <p class="text-strata-gray-600 dark:text-strata-gray-400">
            New to CodeStrata? Learn the basics and get started with your first vault.
          </p>
        </mat-card>
        
        <mat-card class="p-6 hover:shadow-md transition-shadow">
          <mat-icon class="text-strata-primary text-3xl mb-4">account_tree</mat-icon>
          <h2 class="text-xl font-medium mb-2">Strata Vaults</h2>
          <p class="text-strata-gray-600 dark:text-strata-gray-400">
            Questions about creating, managing, and exploring strata vaults.
          </p>
        </mat-card>
        
        <mat-card class="p-6 hover:shadow-md transition-shadow">
          <mat-icon class="text-strata-primary text-3xl mb-4">integration_instructions</mat-icon>
          <h2 class="text-xl font-medium mb-2">GitHub Integration</h2>
          <p class="text-strata-gray-600 dark:text-strata-gray-400">
            Connect your vaults to GitHub repositories and synchronize your work.
          </p>
        </mat-card>
      </div>
      
      <mat-accordion class="mb-12">
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>
              What is CodeStrata?
            </mat-panel-title>
          </mat-expansion-panel-header>
          <p class="py-2">
            CodeStrata is a platform that helps developers visualize, manage, and understand the geological layers of their code repositories. It provides a unique approach to code versioning by treating code like geological strata, with each layer representing different stages in your codebase evolution.
          </p>
        </mat-expansion-panel>
        
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>
              How do I create my first vault?
            </mat-panel-title>
          </mat-expansion-panel-header>
          <p class="py-2">
            Once you've signed up and logged in, navigate to the Vaults dashboard and click the "Create New Vault" button. Enter a name for your vault and click "Create". Your vault will be initialized as a Git repository that you can connect to GitHub.
          </p>
        </mat-expansion-panel>
        
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>
              How does GitHub integration work?
            </mat-panel-title>
          </mat-expansion-panel-header>
          <p class="py-2">
            CodeStrata integrates with GitHub to provide seamless synchronization between your local vault and a remote repository. Connect your GitHub account in the Profile settings, then link your vault to a GitHub repository. Use the "uplift" command to push changes to GitHub.
          </p>
        </mat-expansion-panel>
        
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>
              What is the difference between strata and branches?
            </mat-panel-title>
          </mat-expansion-panel-header>
          <p class="py-2">
            In CodeStrata, "strata" are equivalent to Git branches. We use geological terminology to better visualize the layered nature of code development. The "stratum-shift" command is equivalent to creating a new branch, and "shift-to" is similar to checking out a different branch.
          </p>
        </mat-expansion-panel>
        
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>
              Can I use CodeStrata with existing repositories?
            </mat-panel-title>
          </mat-expansion-panel-header>
          <p class="py-2">
            Yes! Use the "unearth" command to clone an existing repository as a new vault. This preserves all branches, commit history, and file structures from the original repository.
          </p>
        </mat-expansion-panel>
        
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>
              What roles are available in CodeStrata?
            </mat-panel-title>
          </mat-expansion-panel-header>
          <p class="py-2">
            CodeStrata supports different user roles including "student" and "instructor". Each role has access to specific features tailored to their needs. Students can create and manage their own vaults, while instructors have additional functionality for managing student submissions and assignments.
          </p>
        </mat-expansion-panel>
        
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>
              How do I recover a deleted vault?
            </mat-panel-title>
          </mat-expansion-panel-header>
          <p class="py-2">
            If you've connected your vault to GitHub, you can recover it by using the "unearth" command with the GitHub repository URL. This will create a new vault with all the content from the remote repository. For vaults not connected to GitHub, deletion is permanent, so make sure to back up important projects.
          </p>
        </mat-expansion-panel>
      </mat-accordion>
      
      <div class="bg-slate-100 dark:bg-strata-gray-800 p-8 rounded-lg text-center">
        <h2 class="text-2xl font-bold mb-4">Still have questions?</h2>
        <p class="mb-6 text-strata-gray-600 dark:text-strata-gray-400 max-w-2xl mx-auto">
          Can't find the answer you're looking for? Check our documentation or reach out to our community for support.
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <a mat-raised-button color="primary" routerLink="/docs">
            <mat-icon class="mr-2">description</mat-icon>
            Documentation
          </a>
          <a mat-stroked-button routerLink="/community">
            <mat-icon class="mr-2">forum</mat-icon>
            Community
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mat-expansion-panel:not(:last-child) {
      margin-bottom: 8px;
    }
  `]
})
export class FaqComponent {
  constructor() {}
}