import { NgModule } from '@angular/core';
import { RouterModule, Routes, PreloadAllModules } from '@angular/router';
import { AuthGuard } from './auth/guards/auth.guard';

export const routes: Routes = [
  // Redirect root to home page as the landing page
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  // Direct routes for login and register without auth guard to ensure they're always accessible
  { 
    path: 'login', 
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  { 
    path: 'register', 
    loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent)
  },
  
  // Unauthorized access page
  { 
    path: 'unauthorized', 
    loadComponent: () => import('./auth/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent) 
  },
  
  // Auth routes in a dedicated module for better organization
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  },

  // Direct route for GitHub callback for OAuth flow
  {
    path: 'auth/github-callback',
    loadComponent: () =>
      import('./auth/github-callback/github-callback.component').then(
        (m) => m.GithubCallbackComponent
      ),
  },
  
  // Password reset route
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
  },
  
  // Public pages (About, FAQ, Docs) - available without auth
  // About page now has its own component for better SEO and content organization
  { 
    path: "about", 
    loadComponent: () => import("./features/public/about/about.component").then(m => m.AboutComponent) 
  },
  { 
    path: "faq", 
    loadComponent: () => import("./features/public/faq/faq.component").then(m => m.FaqComponent) 
  },
  { 
    path: "docs", 
    loadComponent: () => import("./features/public/docs/docs.component").then(m => m.DocsComponent) 
  },
  { 
    path: "blog", 
    loadComponent: () => import("./features/public/blog/blog.component").then(m => m.BlogComponent) 
  },
  
  // Home and profile as standalone components
  { 
    path: "home", 
    loadComponent: () => import("./features/home/home.component").then(m => m.HomeComponent) 
  },
  { 
    path: "profile", 
    loadComponent: () => import("./features/home/profile.component").then(m => m.ProfileComponent), 
    canActivate: [AuthGuard] 
  },
  
  // New learning and community components
  { 
    path: "learning", 
    loadComponent: () => import("./features/learning/learning.component").then(m => m.LearningComponent),
    canActivate: [AuthGuard]
  },
  { 
    path: "community", 
    loadComponent: () => import("./features/community/community.component").then(m => m.CommunityComponent),
    canActivate: [AuthGuard]
  },
  
  // Authentication-required routes
  {
    path: 'vaults',
    loadComponent: () =>
      import('./features/user-strata-vaults/user-strata-vaults.component').then(
        (m) => m.UserStrataVaultsComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'explore',
    loadComponent: () =>
      import('./features/explore-vaults/explore-vaults.component').then(
        (m) => m.ExploreVaultsComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'vaults/new',
    loadComponent: () =>
      import('./features/user-strata-vaults/user-strata-vaults.component').then(
        (m) => m.UserStrataVaultsComponent
      ),
    canActivate: [AuthGuard],
    data: { action: 'create' }
  },
  
  // Role-specific dashboards
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/user-strata-vaults/user-strata-vaults.component').then(m => m.UserStrataVaultsComponent)
      }
    ]
  },
  
  // Student-specific routes
  {
    path: 'student',
    canActivate: [AuthGuard],
    data: { roles: ['student'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/student/dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/student/dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent)
      },
      {
        path: 'assignments',
        loadComponent: () => import('./features/student/dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent)
      },
      {
        path: 'progress',
        loadComponent: () => import('./features/student/dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent)
      },
      {
        path: 'resources',
        loadComponent: () => import('./features/student/dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent)
      }
    ]
  },
  
  // Instructor-specific routes
  {
    path: 'instructor',
    canActivate: [AuthGuard],
    data: { roles: ['instructor'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/instructor/dashboard/instructor-dashboard.component').then(m => m.InstructorDashboardComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/instructor/dashboard/instructor-dashboard.component').then(m => m.InstructorDashboardComponent)
      },
      {
        path: 'students',
        loadComponent: () => import('./features/instructor/dashboard/instructor-dashboard.component').then(m => m.InstructorDashboardComponent)
      },
      {
        path: 'assignments',
        loadComponent: () => import('./features/instructor/dashboard/instructor-dashboard.component').then(m => m.InstructorDashboardComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/instructor/dashboard/instructor-dashboard.component').then(m => m.InstructorDashboardComponent)
      },
      {
        path: 'materials',
        loadComponent: () => import('./features/instructor/dashboard/instructor-dashboard.component').then(m => m.InstructorDashboardComponent)
      }
    ]
  },
  
  // Admin-specific routes
  {
    path: 'admin',
    canActivate: [AuthGuard],
    data: { roles: ['admin'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'security',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'log',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      }
    ]
  },

  // Redirect all unknown routes to home
  { path: '**', redirectTo: '/home' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      // Preload all modules in the background for better UX
      preloadingStrategy: PreloadAllModules,
      // Enable eager loading for faster initial navigation
      initialNavigation: 'enabledBlocking',
      // Add scroll position restoration
      scrollPositionRestoration: 'enabled',
      // Enable tracing for debugging in development
      enableTracing: false
    })
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
