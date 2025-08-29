import logger from "@/utils/logger.js";
import type { FigmaNode, ComponentAnalysis } from "@/types/index.js";

/**
 * Analyze Figma components for React generation patterns
 */
class ComponentAnalyzer {
  /**
   * Analyze components for React generation insights
   */
  async analyze(components: FigmaNode[]): Promise<{
    overview: {
      totalComponents: number;
      totalNodes: number;
      averageDepth: number;
      componentTypes: Record<string, number>;
    };
    componentTypes: Array<{
      type: string;
      count: number;
      percentage: number;
      examples: string[];
    }>;
    complexity: {
      simple: number;
      moderate: number;
      complex: number;
      veryComplex: number;
    };
    recommendations: string[];
    metadata: {
      analyzedAt: string;
      componentCount: number;
      analysisVersion: string;
    };
  }> {
    logger.info("Starting component analysis", {
      componentCount: components.length,
    });

    const analysis = {
      overview: this.generateOverview(components),
      componentTypes: this.analyzeComponentTypes(components),
      complexity: this.analyzeComplexity(components),
      recommendations: [] as string[],
      metadata: {
        analyzedAt: new Date().toISOString(),
        componentCount: components.length,
        analysisVersion: "1.0.0",
      },
    };

    // Generate recommendations based on analysis
    analysis.recommendations = this.generateRecommendations(analysis);

    logger.info("Component analysis completed", {
      componentCount: components.length,
      recommendationCount: analysis.recommendations.length,
    });

    return analysis;
  }

  /**
   * Generate overview statistics
   */
  private generateOverview(components: FigmaNode[]) {
    const totalNodes = this.countTotalNodes(components);
    const depths = components.map((c) => this.calculateDepth(c));
    const types = new Map<string, number>();

    components.forEach((component) => {
      this.collectTypes(component, types);
    });

    return {
      totalComponents: components.length,
      totalNodes,
      averageDepth:
        depths.length > 0
          ? depths.reduce((a, b) => a + b, 0) / depths.length
          : 0,
      componentTypes: Object.fromEntries(types),
    };
  }

  /**
   * Analyze component types
   */
  private analyzeComponentTypes(components: FigmaNode[]) {
    const typeCount = new Map<string, { count: number; examples: string[] }>();

    components.forEach((component) => {
      const type = component.type;
      if (!typeCount.has(type)) {
        typeCount.set(type, { count: 0, examples: [] });
      }
      const entry = typeCount.get(type)!;
      entry.count++;
      if (entry.examples.length < 3) {
        entry.examples.push(component.name);
      }
    });

    return Array.from(typeCount.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      percentage: (data.count / components.length) * 100,
      examples: data.examples,
    }));
  }

  /**
   * Analyze complexity
   */
  private analyzeComplexity(components: FigmaNode[]) {
    const complexity = { simple: 0, moderate: 0, complex: 0, veryComplex: 0 };

    components.forEach((component) => {
      const nodeCount = this.countNodes(component);
      const depth = this.calculateDepth(component);

      if (nodeCount <= 5 && depth <= 2) {
        complexity.simple++;
      } else if (nodeCount <= 15 && depth <= 4) {
        complexity.moderate++;
      } else if (nodeCount <= 30 && depth <= 6) {
        complexity.complex++;
      } else {
        complexity.veryComplex++;
      }
    });

    return complexity;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];

    if (analysis.complexity.veryComplex > 0) {
      recommendations.push(
        "Consider breaking down very complex components into smaller, reusable parts"
      );
    }

    if (
      analysis.overview.componentTypes.FRAME >
      analysis.overview.totalComponents * 0.7
    ) {
      recommendations.push(
        "High number of Frame components detected - consider using more semantic component types"
      );
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  private countTotalNodes(components: FigmaNode[]): number {
    return components.reduce(
      (total, component) => total + this.countNodes(component),
      0
    );
  }

  private countNodes(component: FigmaNode): number {
    let count = 1;
    if (component.children) {
      count += component.children.reduce(
        (sum, child) => sum + this.countNodes(child),
        0
      );
    }
    return count;
  }

  private calculateDepth(component: FigmaNode): number {
    if (!component.children || component.children.length === 0) {
      return 1;
    }
    return (
      1 +
      Math.max(...component.children.map((child) => this.calculateDepth(child)))
    );
  }

  private collectTypes(component: FigmaNode, types: Map<string, number>): void {
    types.set(component.type, (types.get(component.type) ?? 0) + 1);
    if (component.children) {
      component.children.forEach((child) => {
        this.collectTypes(child, types);
      });
    }
  }
}

export default new ComponentAnalyzer();
