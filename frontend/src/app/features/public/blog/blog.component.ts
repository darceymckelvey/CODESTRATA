import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="text-center mb-12">
        <h1 class="text-3xl font-bold mb-4">CodeStrata Blog</h1>
        <p class="text-strata-gray-600 dark:text-strata-gray-400 max-w-2xl mx-auto">
          Stay up to date with the latest geological code insights, feature announcements, and community highlights.
        </p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <mat-card class="flex flex-col h-full">
          <img src="assets/blog/blog-1.jpg" alt="Geological Code Visualization" class="h-48 w-full object-cover">
          <div class="p-6 flex-grow">
            <div class="flex items-center mb-3 text-sm text-strata-gray-600 dark:text-strata-gray-400">
              <mat-icon class="text-sm mr-1">calendar_today</mat-icon>
              <span>March 15, 2025</span>
            </div>
            <h2 class="text-xl font-bold mb-3">Introducing CodeStrata: A Geological Approach to Code</h2>
            <p class="mb-4 text-strata-gray-600 dark:text-strata-gray-400">
              Learn how CodeStrata applies geological principles to visualize and manage code repositories for better understanding and collaboration.
            </p>
          </div>
          <div class="p-6 pt-0 mt-auto">
            <a mat-button color="primary">Read More</a>
          </div>
        </mat-card>
        
        <mat-card class="flex flex-col h-full">
          <img src="assets/blog/blog-2.jpg" alt="GitHub Integration" class="h-48 w-full object-cover">
          <div class="p-6 flex-grow">
            <div class="flex items-center mb-3 text-sm text-strata-gray-600 dark:text-strata-gray-400">
              <mat-icon class="text-sm mr-1">calendar_today</mat-icon>
              <span>March 10, 2025</span>
            </div>
            <h2 class="text-xl font-bold mb-3">Seamless GitHub Integration with CodeStrata</h2>
            <p class="mb-4 text-strata-gray-600 dark:text-strata-gray-400">
              Discover how to connect your CodeStrata vaults to GitHub repositories for a complete version control solution.
            </p>
          </div>
          <div class="p-6 pt-0 mt-auto">
            <a mat-button color="primary">Read More</a>
          </div>
        </mat-card>
        
        <mat-card class="flex flex-col h-full">
          <img src="assets/blog/blog-3.jpg" alt="Educational Use Cases" class="h-48 w-full object-cover">
          <div class="p-6 flex-grow">
            <div class="flex items-center mb-3 text-sm text-strata-gray-600 dark:text-strata-gray-400">
              <mat-icon class="text-sm mr-1">calendar_today</mat-icon>
              <span>March 5, 2025</span>
            </div>
            <h2 class="text-xl font-bold mb-3">CodeStrata in the Classroom: Teaching Git with Geology</h2>
            <p class="mb-4 text-strata-gray-600 dark:text-strata-gray-400">
              Explore how educators are using CodeStrata to teach version control concepts through familiar geological metaphors.
            </p>
          </div>
          <div class="p-6 pt-0 mt-auto">
            <a mat-button color="primary">Read More</a>
          </div>
        </mat-card>
        
        <mat-card class="flex flex-col h-full">
          <img src="assets/blog/blog-4.jpg" alt="Command Line Interface" class="h-48 w-full object-cover">
          <div class="p-6 flex-grow">
            <div class="flex items-center mb-3 text-sm text-strata-gray-600 dark:text-strata-gray-400">
              <mat-icon class="text-sm mr-1">calendar_today</mat-icon>
              <span>February 28, 2025</span>
            </div>
            <h2 class="text-xl font-bold mb-3">Mastering the CodeStrata CLI: Advanced Techniques</h2>
            <p class="mb-4 text-strata-gray-600 dark:text-strata-gray-400">
              Take your CodeStrata skills to the next level with these advanced command line tips and tricks.
            </p>
          </div>
          <div class="p-6 pt-0 mt-auto">
            <a mat-button color="primary">Read More</a>
          </div>
        </mat-card>
        
        <mat-card class="flex flex-col h-full">
          <img src="assets/blog/blog-5.jpg" alt="Community Spotlight" class="h-48 w-full object-cover">
          <div class="p-6 flex-grow">
            <div class="flex items-center mb-3 text-sm text-strata-gray-600 dark:text-strata-gray-400">
              <mat-icon class="text-sm mr-1">calendar_today</mat-icon>
              <span>February 20, 2025</span>
            </div>
            <h2 class="text-xl font-bold mb-3">Community Spotlight: How Teams Are Using CodeStrata</h2>
            <p class="mb-4 text-strata-gray-600 dark:text-strata-gray-400">
              See real-world examples of how development teams are leveraging CodeStrata to improve their workflows.
            </p>
          </div>
          <div class="p-6 pt-0 mt-auto">
            <a mat-button color="primary">Read More</a>
          </div>
        </mat-card>
        
        <mat-card class="flex flex-col h-full">
          <img src="assets/blog/blog-6.jpg" alt="Future Roadmap" class="h-48 w-full object-cover">
          <div class="p-6 flex-grow">
            <div class="flex items-center mb-3 text-sm text-strata-gray-600 dark:text-strata-gray-400">
              <mat-icon class="text-sm mr-1">calendar_today</mat-icon>
              <span>February 15, 2025</span>
            </div>
            <h2 class="text-xl font-bold mb-3">The Future of CodeStrata: Upcoming Features and Roadmap</h2>
            <p class="mb-4 text-strata-gray-600 dark:text-strata-gray-400">
              Get a sneak peek at what's coming next for CodeStrata, including new features and improvements on the horizon.
            </p>
          </div>
          <div class="p-6 pt-0 mt-auto">
            <a mat-button color="primary">Read More</a>
          </div>
        </mat-card>
      </div>
      
      <div class="mt-12 text-center">
        <nav aria-label="Blog pagination">
          <ul class="inline-flex">
            <li>
              <a 
                class="py-2 px-4 mx-1 rounded-md bg-slate-100 dark:bg-strata-gray-800 hover:bg-strata-primary hover:text-white transition-colors" 
                href="#" 
                aria-label="Previous page"
              >
                <mat-icon>chevron_left</mat-icon>
              </a>
            </li>
            <li>
              <a 
                class="py-2 px-4 mx-1 rounded-md bg-strata-primary text-white" 
                href="#" 
                aria-current="page"
              >
                1
              </a>
            </li>
            <li>
              <a 
                class="py-2 px-4 mx-1 rounded-md bg-slate-100 dark:bg-strata-gray-800 hover:bg-strata-primary hover:text-white transition-colors" 
                href="#"
              >
                2
              </a>
            </li>
            <li>
              <a 
                class="py-2 px-4 mx-1 rounded-md bg-slate-100 dark:bg-strata-gray-800 hover:bg-strata-primary hover:text-white transition-colors" 
                href="#"
              >
                3
              </a>
            </li>
            <li>
              <a 
                class="py-2 px-4 mx-1 rounded-md bg-slate-100 dark:bg-strata-gray-800 hover:bg-strata-primary hover:text-white transition-colors" 
                href="#" 
                aria-label="Next page"
              >
                <mat-icon>chevron_right</mat-icon>
              </a>
            </li>
          </ul>
        </nav>
      </div>
      
      <div class="mt-12 bg-slate-100 dark:bg-strata-gray-800 rounded-lg p-8 text-center">
        <h2 class="text-2xl font-bold mb-4">Subscribe to Our Newsletter</h2>
        <p class="mb-6 text-strata-gray-600 dark:text-strata-gray-400 max-w-2xl mx-auto">
          Get the latest CodeStrata news, tips, and tutorials delivered straight to your inbox.
        </p>
        <div class="flex flex-col md:flex-row justify-center items-center gap-4">
          <a mat-flat-button color="primary" routerLink="/docs">
            <mat-icon class="mr-2">description</mat-icon>
            View Documentation
          </a>
          <a mat-stroked-button routerLink="/faq">
            <mat-icon class="mr-2">help_outline</mat-icon>
            Check FAQ
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mat-card {
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .mat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class BlogComponent {
  constructor() {}
}