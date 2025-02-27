import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatTabsModule, 
    MatIconModule, 
    MatButtonModule,
    MatDividerModule,
    MatListModule,
    RouterModule
  ],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="text-center mb-12">
        <h1 class="text-3xl font-bold mb-4">CodeStrata Documentation</h1>
        <p class="text-strata-gray-600 dark:text-strata-gray-400 max-w-2xl mx-auto">
          Comprehensive guides and references to help you make the most of CodeStrata's features.
        </p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div class="md:col-span-1">
          <mat-card class="sticky top-24">
            <mat-nav-list>
              <h3 mat-subheader>Getting Started</h3>
              <a mat-list-item href="#introduction">
                <mat-icon matListItemIcon>info</mat-icon>
                <span matListItemTitle>Introduction</span>
              </a>
              <a mat-list-item href="#installation">
                <mat-icon matListItemIcon>download</mat-icon>
                <span matListItemTitle>Installation</span>
              </a>
              <a mat-list-item href="#quickstart">
                <mat-icon matListItemIcon>play_arrow</mat-icon>
                <span matListItemTitle>Quick Start</span>
              </a>
              
              <mat-divider></mat-divider>
              
              <h3 mat-subheader>Core Concepts</h3>
              <a mat-list-item href="#vaults">
                <mat-icon matListItemIcon>layers</mat-icon>
                <span matListItemTitle>Strata Vaults</span>
              </a>
              <a mat-list-item href="#stratum">
                <mat-icon matListItemIcon>account_tree</mat-icon>
                <span matListItemTitle>Stratum (Branches)</span>
              </a>
              <a mat-list-item href="#artifacts">
                <mat-icon matListItemIcon>description</mat-icon>
                <span matListItemTitle>Artifacts (Files)</span>
              </a>
              
              <mat-divider></mat-divider>
              
              <h3 mat-subheader>Features</h3>
              <a mat-list-item href="#github">
                <mat-icon matListItemIcon>cloud_sync</mat-icon>
                <span matListItemTitle>GitHub Integration</span>
              </a>
              <a mat-list-item href="#cli">
                <mat-icon matListItemIcon>terminal</mat-icon>
                <span matListItemTitle>CLI Reference</span>
              </a>
              <a mat-list-item href="#api">
                <mat-icon matListItemIcon>code</mat-icon>
                <span matListItemTitle>API Reference</span>
              </a>
            </mat-nav-list>
          </mat-card>
        </div>
        
        <div class="md:col-span-3">
          <mat-card class="p-6 mb-8" id="introduction">
            <h2 class="text-2xl font-bold mb-4">Introduction to CodeStrata</h2>
            <p class="mb-4">
              CodeStrata is a revolutionary platform that applies geological concepts to code repositories,
              helping developers visualize and manage their codebases as layers of evolving strata.
            </p>
            <p class="mb-4">
              Our platform provides a unique perspective on version control, treating code repositories as
              geological formations with distinct layers representing different stages of development.
            </p>
            <div class="bg-slate-100 dark:bg-strata-gray-800 p-4 rounded">
              <strong>Key Benefits:</strong>
              <ul class="list-disc pl-5 mt-2">
                <li>Intuitive visualization of code evolution over time</li>
                <li>Seamless GitHub integration</li>
                <li>Specialized tools for educational environments</li>
                <li>Geological metaphors that make version control more approachable</li>
              </ul>
            </div>
          </mat-card>
          
          <mat-card class="p-6 mb-8" id="installation">
            <h2 class="text-2xl font-bold mb-4">Installation</h2>
            <p class="mb-4">
              CodeStrata provides both a web platform and a CLI tool. The web platform requires no installation,
              while the CLI tool can be installed using npm.
            </p>
            
            <h3 class="text-xl font-medium mt-6 mb-2">Installing the CLI</h3>
            <div class="bg-strata-gray-900 text-white p-4 rounded-md font-mono mb-4">
              npm install -g "codestrata/cli"
            </div>
            
            <p class="mb-4">
              Once installed, you can verify the installation by running:
            </p>
            
            <div class="bg-strata-gray-900 text-white p-4 rounded-md font-mono mb-4">
              strata --version
            </div>
            
            <h3 class="text-xl font-medium mt-6 mb-2">System Requirements</h3>
            <p class="mb-4">
              The CodeStrata CLI requires:
            </p>
            <ul class="list-disc pl-5 mb-4">
              <li>Node.js v14 or later</li>
              <li>Git v2.20 or later</li>
              <li>An active internet connection for GitHub integration</li>
            </ul>
          </mat-card>
          
          <mat-card class="p-6 mb-8" id="quickstart">
            <h2 class="text-2xl font-bold mb-4">Quick Start Guide</h2>
            
            <p class="mb-4">
              Get up and running with CodeStrata in minutes by following these steps:
            </p>
            
            <h3 class="text-xl font-medium mt-4 mb-2">1. Create an Account</h3>
            <p class="mb-4">
              Start by creating an account on the CodeStrata platform. Sign up with your email or GitHub account.
            </p>
            
            <h3 class="text-xl font-medium mt-4 mb-2">2. Create Your First Vault</h3>
            <p class="mb-4">
              After logging in, navigate to the Vaults dashboard and click "Create New Vault". Give your vault a name
              and an optional description.
            </p>
            
            <h3 class="text-xl font-medium mt-4 mb-2">3. Add Files to Your Vault</h3>
            <p class="mb-4">
              You can upload files directly through the web interface or use the CLI tool to add files from your local system.
            </p>
            
            <div class="bg-strata-gray-900 text-white p-4 rounded-md font-mono mb-4">
              strata fossilize --vault="My First Vault" --message="Initial commit"
            </div>
            
            <h3 class="text-xl font-medium mt-4 mb-2">4. Create a New Stratum (Branch)</h3>
            <p class="mb-4">
              Create a new stratum to work on a feature or experiment:
            </p>
            
            <div class="bg-strata-gray-900 text-white p-4 rounded-md font-mono mb-4">
              strata stratum-shift --vault="My First Vault" --name="feature-branch"
            </div>
            
            <h3 class="text-xl font-medium mt-4 mb-2">5. Connect to GitHub (Optional)</h3>
            <p class="mb-4">
              Link your vault to a GitHub repository to synchronize your work:
            </p>
            
            <div class="bg-strata-gray-900 text-white p-4 rounded-md font-mono mb-4">
              strata connect-vault --vault="My First Vault" --repo="https://github.com/username/repo.git"
            </div>
          </mat-card>
          
          <mat-card class="p-6 mb-8" id="cli">
            <h2 class="text-2xl font-bold mb-4">CLI Command Reference</h2>
            
            <p class="mb-4">
              The CodeStrata CLI uses geological terminology for Git operations. Here's a quick reference:
            </p>
            
            <table class="min-w-full bg-white dark:bg-strata-gray-800 rounded-lg overflow-hidden shadow-sm">
              <thead class="bg-strata-gray-100 dark:bg-strata-gray-700">
                <tr>
                  <th class="py-3 px-4 text-left">CodeStrata Command</th>
                  <th class="py-3 px-4 text-left">Git Equivalent</th>
                  <th class="py-3 px-4 text-left">Description</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-strata-gray-200 dark:divide-strata-gray-700">
                <tr>
                  <td class="py-3 px-4 font-mono text-sm">create-vault</td>
                  <td class="py-3 px-4 font-mono text-sm">git init</td>
                  <td class="py-3 px-4">Initialize a new local repository</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-mono text-sm">fossilize</td>
                  <td class="py-3 px-4 font-mono text-sm">git commit</td>
                  <td class="py-3 px-4">Commit changes to the repository</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-mono text-sm">stratum-shift</td>
                  <td class="py-3 px-4 font-mono text-sm">git branch</td>
                  <td class="py-3 px-4">Create a new branch</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-mono text-sm">shift-to</td>
                  <td class="py-3 px-4 font-mono text-sm">git checkout</td>
                  <td class="py-3 px-4">Switch to a different branch</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-mono text-sm">uplift</td>
                  <td class="py-3 px-4 font-mono text-sm">git push</td>
                  <td class="py-3 px-4">Push changes to remote repository</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-mono text-sm">excavate</td>
                  <td class="py-3 px-4 font-mono text-sm">git pull</td>
                  <td class="py-3 px-4">Pull changes from remote repository</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-mono text-sm">unearth</td>
                  <td class="py-3 px-4 font-mono text-sm">git clone</td>
                  <td class="py-3 px-4">Clone a repository as a new vault</td>
                </tr>
              </tbody>
            </table>
            
            <div class="mt-6">
              <p class="mb-4">
                For detailed usage examples and parameters, use the help command:
              </p>
              
              <div class="bg-strata-gray-900 text-white p-4 rounded-md font-mono">
                strata --help
              </div>
            </div>
          </mat-card>
          
          <div class="text-center mt-12">
            <a mat-flat-button color="primary" routerLink="/faq" class="mr-4">
              <mat-icon class="mr-2">help_outline</mat-icon>
              Check FAQ
            </a>
            <a mat-stroked-button href="https://github.com/codestrata/codestrata" target="_blank">
              <mat-icon class="mr-2">code</mat-icon>
              GitHub Repository
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sticky {
      position: sticky;
      top: 80px;
    }
  `]
})
export class DocsComponent {
  constructor() {}
}