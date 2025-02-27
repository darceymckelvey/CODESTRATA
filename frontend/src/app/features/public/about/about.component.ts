import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent {
  // Geological concept data
  geologicalConcepts = [
    {
      name: 'Strata',
      description: 'Distinct layers of code that serve specific purposes, similar to rock layers in geology. Each stratum represents a functional component or feature in your codebase.',
      icon: 'layers'
    },
    {
      name: 'Lithosphere',
      description: 'The foundational structure of your application, containing the core functionality and architectural components that everything else builds upon.',
      icon: 'public'
    },
    {
      name: 'Excavation',
      description: 'The process of discovering and exploring code patterns and structures, digging into the codebase to understand its composition and relationships.',
      icon: 'construction'
    },
    {
      name: 'Formations',
      description: 'Groups of related code components that work together to provide specific functionality, similar to geological formations created over time.',
      icon: 'view_quilt'
    },
    {
      name: 'Erosion',
      description: 'The degradation of code quality over time due to technical debt, changing requirements, or inconsistent practices that need to be addressed.',
      icon: 'warning'
    },
    {
      name: 'Seismic Activity',
      description: 'Major changes or refactoring efforts that reshape the codebase landscape, potentially causing ripple effects throughout connected systems.',
      icon: 'open_in_new'
    },
    {
      name: 'Fossilization',
      description: 'The process of preserving code artifacts and snapshots for future reference, similar to how organic material becomes fossilized in rock layers.',
      icon: 'history'
    },
    {
      name: 'Tectonic Shifts',
      description: 'Large-scale architectural changes that fundamentally alter how the components of a system interact, similar to the movement of tectonic plates.',
      icon: 'swap_horiz'
    }
  ];

  // Team members data
  teamMembers = [
    {
      name: 'Alex Johnson',
      role: 'Founder & Lead Architect',
      bio: 'Passionate about applying geological principles to software development. With 15+ years of experience in large-scale systems architecture.',
      image: 'assets/images/team/alex.jpg'
    },
    {
      name: 'Maya Rodriguez',
      role: 'UX/UI Design Lead',
      bio: 'Creates intuitive interfaces that help developers visualize code layers. Previously led design teams at major tech companies.',
      image: 'assets/images/team/maya.jpg'
    },
    {
      name: 'Chris Lee',
      role: 'Engineering Lead',
      bio: 'Specializes in code analysis tools and visualization techniques. Has contributed to multiple open-source projects.',
      image: 'assets/images/team/chris.jpg'
    }
  ];
}