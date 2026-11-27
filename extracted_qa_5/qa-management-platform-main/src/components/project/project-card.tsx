interface ProjectCardProps {
  id: string;
  key: string;
  name: string;
  description: string;
  status: string;
  requirements: number;
  testCases: number;
  passRate: number;
}

export function ProjectCard({ key, name, description, status, requirements, testCases, passRate }: ProjectCardProps) {
  return (
    <div className="bg-secondary border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-muted-foreground">{key}</span>
            <span className={`text-xs px-2 py-1 rounded ${
              status === 'active' 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {status}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mt-2">{name}</h3>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Requirements</span>
          <span className="text-foreground">{requirements}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Test Cases</span>
          <span className="text-foreground">{testCases}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pass Rate</span>
          <span className="text-foreground">{passRate}%</span>
        </div>
      </div>
    </div>
  );
}