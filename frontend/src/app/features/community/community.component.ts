import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

interface CommunityPost {
  id: number;
  author: string;
  title: string;
  content: string;
  likes: number;
  comments: number;
  timestamp: Date;
}

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.css']
})
export class CommunityComponent {
  // Sample posts for demonstration
  posts: CommunityPost[] = [
    {
      id: 1,
      author: 'CodeMaster',
      title: 'Tips for effective code excavation',
      content: 'When excavating code in your strata vaults, always look for patterns across different versions. This can reveal interesting insights about how the codebase evolved over time.',
      likes: 24,
      comments: 5,
      timestamp: new Date(Date.now() - 86400000 * 2) // 2 days ago
    },
    {
      id: 2,
      author: 'StrataExplorer',
      title: 'My journey with CodeStrata so far',
      content: 'I\'ve been using CodeStrata for about a month now and I\'m impressed with how much it has improved my understanding of complex codebases. The visualization tools are especially helpful.',
      likes: 42,
      comments: 12,
      timestamp: new Date(Date.now() - 86400000) // 1 day ago
    },
    {
      id: 3,
      author: 'DevTeamLead',
      title: 'How we use CodeStrata in our development workflow',
      content: 'Our team has integrated CodeStrata into our development process. We use the fossilization feature to mark important code segments and share insights across the team.',
      likes: 18,
      comments: 3,
      timestamp: new Date() // Today
    }
  ];

  likePost(post: CommunityPost): void {
    post.likes++;
    // In a real app, this would call an API to update the like count
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    // For older posts, show the actual date
    return date.toLocaleDateString();
  }
} 