import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  progress: number;
  modules: LearningModule[];
  isActive: boolean;
}

interface LearningModule {
  id: string;
  title: string;
  description: string;
  progress: number;
  isCompleted: boolean;
  lessons: LearningLesson[];
}

interface LearningLesson {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
}

@Component({
  selector: 'app-learning',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule,
    RouterModule
  ],
  templateUrl: './learning.component.html',
  styleUrls: ['./learning.component.css'],
})
export class LearningComponent implements OnInit {
  // Sample learning paths for demo
  learningPaths: LearningPath[] = [
    {
      id: 'beginners-guide',
      title: 'Beginner\'s Guide to CodeStrata',
      description: 'Learn the fundamentals of CodeStrata and explore basic features.',
      progress: 0,
      isActive: false,
      modules: [
        {
          id: 'intro',
          title: 'Introduction to CodeStrata',
          description: 'Understanding the basics of code layers and strata vaults.',
          progress: 0,
          isCompleted: false,
          lessons: [
            {
              id: 'lesson1',
              title: 'What is CodeStrata?',
              description: 'An overview of the CodeStrata platform and its core concepts.',
              isCompleted: false
            },
            {
              id: 'lesson2',
              title: 'Creating Your First Vault',
              description: 'Learn how to create and manage your first strata vault.',
              isCompleted: false
            }
          ]
        },
        {
          id: 'basics',
          title: 'Basic Operations',
          description: 'Learn basic operations like excavation, fossilization, and strata shifts.',
          progress: 0,
          isCompleted: false,
          lessons: [
            {
              id: 'lesson1',
              title: 'Excavating Code Artifacts',
              description: 'How to excavate and analyze code artifacts in your vaults.',
              isCompleted: false
            },
            {
              id: 'lesson2',
              title: 'Fossilizing Important Discoveries',
              description: 'Learn how to preserve important code insights as fossils.',
              isCompleted: false
            }
          ]
        }
      ]
    },
    {
      id: 'advanced-techniques',
      title: 'Advanced CodeStrata Techniques',
      description: 'Take your skills to the next level with advanced vault analysis.',
      progress: 0,
      isActive: false,
      modules: [
        {
          id: 'advanced-excavation',
          title: 'Advanced Excavation Techniques',
          description: 'Deep dive into complex excavation patterns and strategies.',
          progress: 0,
          isCompleted: false,
          lessons: [
            {
              id: 'lesson1',
              title: 'Pattern Recognition in Code Strata',
              description: 'Identify patterns across different code layers and versions.',
              isCompleted: false
            },
            {
              id: 'lesson2',
              title: 'Correlation Analysis',
              description: 'Correlate findings across multiple repositories and projects.',
              isCompleted: false
            }
          ]
        }
      ]
    }
  ];

  activePath: LearningPath | null = null;
  activeModule: LearningModule | null = null;
  
  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Check if user has an active learning path
    // For demo purposes, we'll just show none are active yet
  }

  startLearningPath(pathId: string): void {
    // Activate the selected learning path
    this.learningPaths.forEach(path => {
      if (path.id === pathId) {
        path.isActive = true;
        this.activePath = path;
      } else {
        path.isActive = false;
      }
    });
    
    // For a real implementation, we would save this to the user's profile in the backend
    console.log(`Started learning path: ${pathId}`);
  }

  selectModule(moduleId: string): void {
    if (!this.activePath) return;
    
    this.activePath.modules.forEach(module => {
      if (module.id === moduleId) {
        this.activeModule = module;
      }
    });
  }

  completeLesson(moduleId: string, lessonId: string): void {
    if (!this.activePath) return;
    
    // Find the module and lesson
    const module = this.activePath.modules.find(m => m.id === moduleId);
    if (!module) return;
    
    const lesson = module.lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    
    // Mark the lesson as completed
    lesson.isCompleted = true;
    
    // Update module progress
    const completedLessons = module.lessons.filter(l => l.isCompleted).length;
    module.progress = (completedLessons / module.lessons.length) * 100;
    
    // Update path progress
    this.updatePathProgress();
  }

  updatePathProgress(): void {
    if (!this.activePath) return;
    
    // Calculate total progress across all modules
    const totalModules = this.activePath.modules.length;
    const totalProgress = this.activePath.modules.reduce((sum, module) => sum + module.progress, 0);
    
    this.activePath.progress = totalProgress / totalModules;
  }
} 