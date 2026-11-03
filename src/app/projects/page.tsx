'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import Link from 'next/link';

export default function ProjectsPage() {
  const [projects] = useState([
    {
      id: '1',
      key: 'MBA',
      name: 'Mobile Banking App',
      description: 'Core banking mobile application',
      status: 'active',
      requirements: 45,
      testCases: 234,
      passRate: 87,
    },
    {
      id: '2',
      key: 'ECP',
      name: 'E-Commerce Platform',
      description: 'Online shopping platform',
      status: 'active',
      requirements: 128,
      testCases: 567,
      passRate: 92,
    },
    {
      id: '3',
      key: 'HRP',
      name: 'HR Management System',
      description: 'Employee management and payroll',
      status: 'archived',
      requirements: 67,
      testCases: 189,
      passRate: 78,
    },
  ]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <Link
              href="/projects/new"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm"
            >
              New Project
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-secondary border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground">{project.key}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        project.status === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mt-2">{project.name}</h3>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">{project.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requirements</span>
                    <span className="text-foreground">{project.requirements}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Test Cases</span>
                    <span className="text-foreground">{project.testCases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pass Rate</span>
                    <span className="text-foreground">{project.passRate}%</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View Project →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
