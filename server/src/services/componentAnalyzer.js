const logger = require("../utils/logger");

/**
 * Analyze Figma components for React generation patterns
 */
class ComponentAnalyzer {
  /**
   * Analyze components for React generation insights
   */
  async analyze(components) {
    logger.info("Starting component analysis", {
      componentCount: components.length,
    });

    const analysis = {
      overview: this.generateOverview(components),
      componentTypes: this.analyzeComponentTypes(components),
      designPatterns: this.identifyDesignPatterns(components),
      complexity: this.analyzeComplexity(components),
      reusability: this.analyzeReusability(components),
      accessibility: this.analyzeAccessibility(components),
      performance: this.analyzePerformance(components),
      recommendations: [],
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
  generateOverview(components) {
    const totalNodes = this.countTotalNodes(components);
    const depths = components.map((c) => this.calculateDepth(c));
    const types = new Set();

    components.forEach((component) => {
      this.collectTypes(component, types);
    });

    return {
      totalComponents: components.length,
      totalNodes,
      averageDepth: depths.reduce((sum, d) => sum + d, 0) / depths.length,
      maxDepth: Math.max(...depths),
      uniqueNodeTypes: Array.from(types),
      estimatedComplexity: this.calculateOverallComplexity(components),
    };
  }

  /**
   * Analyze component types and their distribution
   */
  analyzeComponentTypes(components) {
    const typeAnalysis = {
      containers: [],
      textElements: [],
      imageElements: [],
      interactiveElements: [],
      componentInstances: [],
      customComponents: [],
    };

    components.forEach((component) => {
      const analysis = this.analyzeComponentStructure(component);

      switch (analysis.primaryType) {
        case "container":
          typeAnalysis.containers.push(analysis);
          break;
        case "text":
          typeAnalysis.textElements.push(analysis);
          break;
        case "image":
          typeAnalysis.imageElements.push(analysis);
          break;
        case "interactive":
          typeAnalysis.interactiveElements.push(analysis);
          break;
        case "component-instance":
          typeAnalysis.componentInstances.push(analysis);
          break;
        default:
          typeAnalysis.customComponents.push(analysis);
      }
    });

    return typeAnalysis;
  }

  /**
   * Identify common design patterns
   */
  identifyDesignPatterns(components) {
    const patterns = {
      cardPattern: this.detectCardPattern(components),
      listPattern: this.detectListPattern(components),
      navigationPattern: this.detectNavigationPattern(components),
      formPattern: this.detectFormPattern(components),
      gridPattern: this.detectGridPattern(components),
      modalPattern: this.detectModalPattern(components),
      buttonPattern: this.detectButtonPattern(components),
    };

    return {
      detected: Object.entries(patterns).filter(
        ([, detected]) => detected.length > 0
      ),
      summary: Object.entries(patterns).map(([pattern, instances]) => ({
        pattern,
        count: instances.length,
        confidence: this.calculatePatternConfidence(pattern, instances),
      })),
    };
  }

  /**
   * Analyze component complexity
   */
  analyzeComplexity(components) {
    const complexities = components.map((component) => ({
      id: component.id,
      name: component.name,
      nodeCount: this.countNodes(component),
      depth: this.calculateDepth(component),
      stylingComplexity: this.calculateStylingComplexity(component),
      interactionComplexity: this.calculateInteractionComplexity(component),
      overallComplexity: this.calculateComponentComplexity(component),
    }));

    const totalComplexity = complexities.reduce(
      (sum, c) => sum + c.overallComplexity,
      0
    );
    const averageComplexity = totalComplexity / complexities.length;

    return {
      components: complexities,
      statistics: {
        total: totalComplexity,
        average: averageComplexity,
        median: this.calculateMedian(
          complexities.map((c) => c.overallComplexity)
        ),
        distribution: this.calculateComplexityDistribution(complexities),
      },
    };
  }

  /**
   * Analyze component reusability potential
   */
  analyzeReusability(components) {
    const reusabilityAnalysis = components.map((component) => {
      const analysis = {
        id: component.id,
        name: component.name,
        reusabilityScore: 0,
        factors: {
          hasVariants: !!component.componentProperties,
          isParametric: this.isParametric(component),
          hasConsistentStyling: this.hasConsistentStyling(component),
          isAtomicDesign: this.followsAtomicDesign(component),
          hasSemanticNaming: this.hasSemanticNaming(component),
        },
      };

      // Calculate reusability score
      analysis.reusabilityScore = Object.values(analysis.factors).reduce(
        (score, factor) => score + (factor ? 20 : 0),
        0
      );

      return analysis;
    });

    return {
      components: reusabilityAnalysis,
      summary: {
        highReusability: reusabilityAnalysis.filter(
          (c) => c.reusabilityScore >= 80
        ),
        mediumReusability: reusabilityAnalysis.filter(
          (c) => c.reusabilityScore >= 50 && c.reusabilityScore < 80
        ),
        lowReusability: reusabilityAnalysis.filter(
          (c) => c.reusabilityScore < 50
        ),
      },
    };
  }

  /**
   * Analyze accessibility considerations
   */
  analyzeAccessibility(components) {
    const accessibilityIssues = [];
    const recommendations = [];

    components.forEach((component) => {
      const issues = this.checkAccessibilityIssues(component);
      accessibilityIssues.push(...issues);
    });

    return {
      issues: accessibilityIssues,
      summary: {
        totalIssues: accessibilityIssues.length,
        criticalIssues: accessibilityIssues.filter(
          (i) => i.severity === "critical"
        ).length,
        warningIssues: accessibilityIssues.filter(
          (i) => i.severity === "warning"
        ).length,
        infoIssues: accessibilityIssues.filter((i) => i.severity === "info")
          .length,
      },
      recommendations:
        this.generateAccessibilityRecommendations(accessibilityIssues),
    };
  }

  /**
   * Analyze performance considerations
   */
  analyzePerformance(components) {
    const performanceMetrics = components.map((component) => ({
      id: component.id,
      name: component.name,
      estimatedRenderCost: this.estimateRenderCost(component),
      memoryFootprint: this.estimateMemoryFootprint(component),
      optimizationOpportunities:
        this.identifyOptimizationOpportunities(component),
    }));

    return {
      components: performanceMetrics,
      summary: {
        totalEstimatedCost: performanceMetrics.reduce(
          (sum, m) => sum + m.estimatedRenderCost,
          0
        ),
        heaviestComponents: performanceMetrics
          .sort((a, b) => b.estimatedRenderCost - a.estimatedRenderCost)
          .slice(0, 5),
        optimizationOpportunities: performanceMetrics
          .flatMap((m) => m.optimizationOpportunities)
          .reduce((acc, opp) => {
            acc[opp.type] = (acc[opp.type] || 0) + 1;
            return acc;
          }, {}),
      },
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Complexity recommendations
    const highComplexityComponents = analysis.complexity.components.filter(
      (c) => c.overallComplexity > 50
    );

    if (highComplexityComponents.length > 0) {
      recommendations.push({
        type: "complexity",
        priority: "high",
        title: "Simplify High-Complexity Components",
        description: `${highComplexityComponents.length} components have high complexity. Consider breaking them down into smaller, reusable components.`,
        components: highComplexityComponents.map((c) => c.name),
        action: "refactor",
      });
    }

    // Reusability recommendations
    const lowReusabilityComponents =
      analysis.reusability.summary.lowReusability;
    if (lowReusabilityComponents.length > 0) {
      recommendations.push({
        type: "reusability",
        priority: "medium",
        title: "Improve Component Reusability",
        description: `${lowReusabilityComponents.length} components have low reusability scores. Consider adding variants or making them more parametric.`,
        components: lowReusabilityComponents.map((c) => c.name),
        action: "enhance",
      });
    }

    // Accessibility recommendations
    if (analysis.accessibility.summary.criticalIssues > 0) {
      recommendations.push({
        type: "accessibility",
        priority: "critical",
        title: "Fix Critical Accessibility Issues",
        description: `${analysis.accessibility.summary.criticalIssues} critical accessibility issues found. These must be addressed before production.`,
        action: "fix",
      });
    }

    // Performance recommendations
    const heavyComponents =
      analysis.performance.summary.heaviestComponents.slice(0, 3);
    if (heavyComponents.length > 0) {
      recommendations.push({
        type: "performance",
        priority: "medium",
        title: "Optimize Heavy Components",
        description:
          "Several components have high estimated render costs. Consider optimization strategies.",
        components: heavyComponents.map((c) => c.name),
        action: "optimize",
      });
    }

    return recommendations;
  }

  // Helper methods for analysis

  analyzeComponentStructure(component) {
    return {
      id: component.id,
      name: component.name,
      primaryType: this.determinePrimaryType(component),
      hasChildren: !!(component.children && component.children.length > 0),
      childCount: component.children?.length || 0,
      depth: this.calculateDepth(component),
      nodeTypes: this.getUniqueNodeTypes(component),
    };
  }

  determinePrimaryType(component) {
    if (component.componentId) return "component-instance";
    if (component.type === "TEXT") return "text";
    if (
      component.type === "RECTANGLE" &&
      component.fills?.some((f) => f.type === "IMAGE")
    )
      return "image";
    if (component.type === "FRAME" && component.children?.length > 0)
      return "container";
    if (this.hasInteractiveProperties(component)) return "interactive";
    return "element";
  }

  hasInteractiveProperties(component) {
    // Check for properties that suggest interactivity
    return !!(
      component.componentProperties?.some((prop) => prop.type === "BOOLEAN") ||
      component.name.toLowerCase().includes("button") ||
      component.name.toLowerCase().includes("link") ||
      component.name.toLowerCase().includes("input")
    );
  }

  // Pattern detection methods

  detectCardPattern(components) {
    return components
      .filter((component) => {
        return (
          component.type === "FRAME" &&
          component.children?.length >= 2 &&
          component.fills?.some((fill) => fill.type === "SOLID") &&
          (component.cornerRadius > 0 ||
            component.effects?.some((e) => e.type === "DROP_SHADOW"))
        );
      })
      .map((c) => ({ id: c.id, name: c.name, confidence: 0.8 }));
  }

  detectListPattern(components) {
    return components
      .filter((component) => {
        const hasRepeatingChildren = component.children?.length >= 3;
        const childrenAreSimilar =
          hasRepeatingChildren && this.areChildrenSimilar(component.children);
        return hasRepeatingChildren && childrenAreSimilar;
      })
      .map((c) => ({ id: c.id, name: c.name, confidence: 0.7 }));
  }

  detectButtonPattern(components) {
    return components
      .filter((component) => {
        const hasButtonName = component.name.toLowerCase().includes("button");
        const hasTextChild = component.children?.some(
          (child) => child.type === "TEXT"
        );
        const hasBackground = component.fills?.some(
          (fill) => fill.type === "SOLID"
        );
        const hasRoundedCorners = component.cornerRadius > 0;

        return (
          hasButtonName || (hasTextChild && hasBackground && hasRoundedCorners)
        );
      })
      .map((c) => ({ id: c.id, name: c.name, confidence: 0.9 }));
  }

  detectNavigationPattern(components) {
    return components
      .filter((component) => {
        const name = component.name.toLowerCase();
        const hasNavName =
          name.includes("nav") ||
          name.includes("menu") ||
          name.includes("header");
        const hasMultipleTextChildren =
          component.children?.filter((child) => child.type === "TEXT").length >=
          2;

        return hasNavName && hasMultipleTextChildren;
      })
      .map((c) => ({ id: c.id, name: c.name, confidence: 0.6 }));
  }

  detectFormPattern(components) {
    return components
      .filter((component) => {
        const name = component.name.toLowerCase();
        const hasFormName =
          name.includes("form") ||
          name.includes("input") ||
          name.includes("field");
        const hasInputLikeStructure = component.children?.some(
          (child) =>
            child.type === "RECTANGLE" &&
            child.fills?.some((f) => f.type === "SOLID")
        );

        return hasFormName || hasInputLikeStructure;
      })
      .map((c) => ({ id: c.id, name: c.name, confidence: 0.7 }));
  }

  detectGridPattern(components) {
    return components
      .filter((component) => {
        const hasGridLayout = component.children?.length >= 4;
        const childrenHaveSimilarSizes =
          hasGridLayout &&
          this.childrenHaveSimilarDimensions(component.children);

        return hasGridLayout && childrenHaveSimilarSizes;
      })
      .map((c) => ({ id: c.id, name: c.name, confidence: 0.6 }));
  }

  detectModalPattern(components) {
    return components
      .filter((component) => {
        const name = component.name.toLowerCase();
        const hasModalName =
          name.includes("modal") ||
          name.includes("dialog") ||
          name.includes("popup");
        const hasOverlayStructure = component.fills?.some(
          (fill) => fill.color?.a < 1
        );

        return hasModalName || hasOverlayStructure;
      })
      .map((c) => ({ id: c.id, name: c.name, confidence: 0.8 }));
  }

  // Complexity calculation methods

  calculateComponentComplexity(component) {
    const nodeCount = this.countNodes(component);
    const depth = this.calculateDepth(component);
    const stylingComplexity = this.calculateStylingComplexity(component);
    const interactionComplexity =
      this.calculateInteractionComplexity(component);

    return (
      nodeCount * 2 + depth * 3 + stylingComplexity + interactionComplexity
    );
  }

  calculateStylingComplexity(component) {
    let complexity = 0;

    if (component.fills?.length > 1) complexity += 5;
    if (component.strokes?.length > 0) complexity += 3;
    if (component.effects?.length > 0)
      complexity += component.effects.length * 2;
    if (component.cornerRadius > 0) complexity += 2;

    return complexity;
  }

  calculateInteractionComplexity(component) {
    let complexity = 0;

    if (component.componentProperties) {
      complexity += Object.keys(component.componentProperties).length * 3;
    }

    return complexity;
  }

  // Accessibility checking methods

  checkAccessibilityIssues(component) {
    const issues = [];

    // Check for missing alt text on images
    if (
      component.type === "RECTANGLE" &&
      component.fills?.some((f) => f.type === "IMAGE")
    ) {
      issues.push({
        componentId: component.id,
        componentName: component.name,
        type: "missing-alt-text",
        severity: "critical",
        message: "Image component missing alt text",
      });
    }

    // Check for low contrast text
    if (component.type === "TEXT" && component.style) {
      // This would need actual color contrast calculation
      issues.push({
        componentId: component.id,
        componentName: component.name,
        type: "color-contrast",
        severity: "warning",
        message: "Text color contrast should be verified",
      });
    }

    // Check for interactive elements without proper naming
    if (
      this.hasInteractiveProperties(component) &&
      !this.hasSemanticNaming(component)
    ) {
      issues.push({
        componentId: component.id,
        componentName: component.name,
        type: "semantic-naming",
        severity: "warning",
        message: "Interactive component should have semantic naming",
      });
    }

    return issues;
  }

  generateAccessibilityRecommendations(issues) {
    const recommendations = [];
    const issueTypes = issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {});

    Object.entries(issueTypes).forEach(([type, count]) => {
      switch (type) {
        case "missing-alt-text":
          recommendations.push(`Add alt text to ${count} image component(s)`);
          break;
        case "color-contrast":
          recommendations.push(
            `Verify color contrast for ${count} text component(s)`
          );
          break;
        case "semantic-naming":
          recommendations.push(
            `Improve semantic naming for ${count} interactive component(s)`
          );
          break;
      }
    });

    return recommendations;
  }

  // Performance analysis methods

  estimateRenderCost(component) {
    const nodeCount = this.countNodes(component);
    const effectsCount = component.effects?.length || 0;
    const hasComplexFills = component.fills?.some(
      (f) => f.type === "GRADIENT_LINEAR" || f.type === "GRADIENT_RADIAL"
    );

    let cost = nodeCount * 2;
    cost += effectsCount * 5;
    if (hasComplexFills) cost += 10;

    return cost;
  }

  estimateMemoryFootprint(component) {
    const nodeCount = this.countNodes(component);
    const textLength = this.getTotalTextLength(component);

    return nodeCount * 100 + textLength * 2; // Rough estimate in bytes
  }

  identifyOptimizationOpportunities(component) {
    const opportunities = [];

    if (this.countNodes(component) > 20) {
      opportunities.push({
        type: "component-splitting",
        description: "Consider splitting this component into smaller parts",
        impact: "medium",
      });
    }

    if (component.effects?.length > 2) {
      opportunities.push({
        type: "effect-optimization",
        description: "Multiple effects may impact performance",
        impact: "low",
      });
    }

    if (component.fills?.some((f) => f.type === "IMAGE")) {
      opportunities.push({
        type: "image-optimization",
        description: "Optimize image assets for web delivery",
        impact: "high",
      });
    }

    return opportunities;
  }

  // Utility methods

  countTotalNodes(components) {
    return components.reduce(
      (sum, component) => sum + this.countNodes(component),
      0
    );
  }

  countNodes(component) {
    let count = 1;
    if (component.children) {
      count += component.children.reduce(
        (sum, child) => sum + this.countNodes(child),
        0
      );
    }
    return count;
  }

  calculateDepth(component, depth = 0) {
    if (!component.children || component.children.length === 0) {
      return depth;
    }
    return Math.max(
      ...component.children.map((child) =>
        this.calculateDepth(child, depth + 1)
      )
    );
  }

  collectTypes(component, types) {
    types.add(component.type);
    if (component.children) {
      component.children.forEach((child) => this.collectTypes(child, types));
    }
  }

  getUniqueNodeTypes(component) {
    const types = new Set();
    this.collectTypes(component, types);
    return Array.from(types);
  }

  calculateOverallComplexity(components) {
    return components.reduce(
      (sum, component) => sum + this.calculateComponentComplexity(component),
      0
    );
  }

  calculateMedian(values) {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  calculateComplexityDistribution(complexities) {
    const values = complexities.map((c) => c.overallComplexity);
    return {
      low: values.filter((v) => v < 20).length,
      medium: values.filter((v) => v >= 20 && v < 50).length,
      high: values.filter((v) => v >= 50).length,
    };
  }

  calculatePatternConfidence(pattern, instances) {
    // Simple confidence calculation based on pattern type and instance count
    const baseConfidence = {
      cardPattern: 0.8,
      listPattern: 0.7,
      buttonPattern: 0.9,
      navigationPattern: 0.6,
      formPattern: 0.7,
      gridPattern: 0.6,
      modalPattern: 0.8,
    };

    const confidence = baseConfidence[pattern] || 0.5;
    return Math.min(confidence + instances.length * 0.05, 1.0);
  }

  // Reusability analysis helpers

  isParametric(component) {
    return !!(
      component.componentProperties &&
      Object.keys(component.componentProperties).length > 0
    );
  }

  hasConsistentStyling(component) {
    // Simple heuristic: components with fills and consistent corner radius
    return !!(
      component.fills?.length > 0 && typeof component.cornerRadius === "number"
    );
  }

  followsAtomicDesign(component) {
    // Check if component follows atomic design principles (simple heuristic)
    const nodeCount = this.countNodes(component);
    const name = component.name.toLowerCase();

    // Atoms: 1-3 nodes, simple names
    if (
      nodeCount <= 3 &&
      (name.includes("button") ||
        name.includes("input") ||
        name.includes("icon"))
    ) {
      return true;
    }

    // Molecules: 4-10 nodes, compound names
    if (
      nodeCount <= 10 &&
      (name.includes("card") || name.includes("form") || name.includes("nav"))
    ) {
      return true;
    }

    return false;
  }

  hasSemanticNaming(component) {
    const name = component.name.toLowerCase();
    const semanticTerms = [
      "button",
      "input",
      "form",
      "nav",
      "header",
      "footer",
      "main",
      "section",
      "article",
    ];
    return semanticTerms.some((term) => name.includes(term));
  }

  areChildrenSimilar(children) {
    if (children.length < 2) return false;

    const firstChild = children[0];
    return children
      .slice(1)
      .every(
        (child) =>
          child.type === firstChild.type &&
          Math.abs(
            (child.absoluteBoundingBox?.width || 0) -
              (firstChild.absoluteBoundingBox?.width || 0)
          ) < 10
      );
  }

  childrenHaveSimilarDimensions(children) {
    if (children.length < 2) return false;

    const dimensions = children.map((child) => ({
      width: child.absoluteBoundingBox?.width || 0,
      height: child.absoluteBoundingBox?.height || 0,
    }));

    const avgWidth =
      dimensions.reduce((sum, d) => sum + d.width, 0) / dimensions.length;
    const avgHeight =
      dimensions.reduce((sum, d) => sum + d.height, 0) / dimensions.length;

    return dimensions.every(
      (d) =>
        Math.abs(d.width - avgWidth) < avgWidth * 0.2 &&
        Math.abs(d.height - avgHeight) < avgHeight * 0.2
    );
  }

  getTotalTextLength(component) {
    let length = 0;

    if (component.type === "TEXT" && component.characters) {
      length += component.characters.length;
    }

    if (component.children) {
      length += component.children.reduce(
        (sum, child) => sum + this.getTotalTextLength(child),
        0
      );
    }

    return length;
  }
}

module.exports = new ComponentAnalyzer();
