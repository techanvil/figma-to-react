import logger from "@/utils/logger.js";
import type { FigmaNode, ComponentEntry } from "@/types/index.js";

/**
 * Component Name Index Service
 * Manages indexing and searching of components by custom names
 */
class ComponentNameIndex {
  // In-memory index for demo (replace with Redis/Database in production)
  private nameIndex = new Map<string, Set<string>>(); // customName -> Set of sessionIds
  private sessionComponents = new Map<string, FigmaNode[]>(); // sessionId -> components
  private componentsByName = new Map<string, Map<string, FigmaNode>>(); // customName -> Map<sessionId, component>

  /**
   * Index components by their custom names
   */
  indexComponents(sessionId: string, components: FigmaNode[]): void {
    logger.info("Indexing components by custom names", {
      sessionId,
      componentCount: components.length,
    });

    // Store session components
    this.sessionComponents.set(sessionId, components);

    // Index each component with a custom name
    components.forEach((component) => {
      if (component.customName) {
        const normalizedName = this.normalizeCustomName(component.customName);

        // Add to name index
        if (!this.nameIndex.has(normalizedName)) {
          this.nameIndex.set(normalizedName, new Set());
        }
        this.nameIndex.get(normalizedName)!.add(sessionId);

        // Add to components by name index
        if (!this.componentsByName.has(normalizedName)) {
          this.componentsByName.set(normalizedName, new Map());
        }
        this.componentsByName.get(normalizedName)!.set(sessionId, component);

        logger.debug("Indexed component", {
          sessionId,
          componentId: component.id,
          originalName: component.name,
          customName: component.customName,
          normalizedName,
        });
      }

      // Recursively index children
      if (component.children) {
        this.indexComponents(sessionId, component.children);
      }
    });
  }

  /**
   * Remove components from index when session is deleted
   */
  removeSessionFromIndex(sessionId: string): void {
    logger.info("Removing session from component name index", { sessionId });

    const components = this.sessionComponents.get(sessionId);
    if (components) {
      this.removeComponentsFromIndex(sessionId, components);
      this.sessionComponents.delete(sessionId);
    }
  }

  /**
   * Search components by custom name
   */
  searchByCustomName(customName: string): {
    exactMatches: Array<{ sessionId: string; component: FigmaNode }>;
    partialMatches: Array<{
      sessionId: string;
      component: FigmaNode;
      similarity: number;
    }>;
  } {
    const normalizedQuery = this.normalizeCustomName(customName);
    const exactMatches: Array<{ sessionId: string; component: FigmaNode }> = [];
    const partialMatches: Array<{
      sessionId: string;
      component: FigmaNode;
      similarity: number;
    }> = [];

    // Find exact matches
    const exactSessionIds = this.nameIndex.get(normalizedQuery);
    if (exactSessionIds) {
      const componentsMap = this.componentsByName.get(normalizedQuery);
      if (componentsMap) {
        exactSessionIds.forEach((sessionId) => {
          const component = componentsMap.get(sessionId);
          if (component) {
            exactMatches.push({ sessionId, component });
          }
        });
      }
    }

    // Find partial matches
    this.nameIndex.forEach((sessionIds, indexedName) => {
      if (
        indexedName !== normalizedQuery &&
        this.isPartialMatch(normalizedQuery, indexedName)
      ) {
        const similarity = this.calculateSimilarity(
          normalizedQuery,
          indexedName
        );
        const componentsMap = this.componentsByName.get(indexedName);

        if (componentsMap) {
          sessionIds.forEach((sessionId) => {
            const component = componentsMap.get(sessionId);
            if (component) {
              partialMatches.push({ sessionId, component, similarity });
            }
          });
        }
      }
    });

    // Sort partial matches by similarity
    partialMatches.sort((a, b) => b.similarity - a.similarity);

    logger.info("Component search completed", {
      query: customName,
      exactMatches: exactMatches.length,
      partialMatches: partialMatches.length,
    });

    return { exactMatches, partialMatches };
  }

  /**
   * Get all indexed custom names
   */
  getAllCustomNames(): Array<{
    customName: string;
    count: number;
    sessions: string[];
  }> {
    const result: Array<{
      customName: string;
      count: number;
      sessions: string[];
    }> = [];

    this.nameIndex.forEach((sessionIds, customName) => {
      result.push({
        customName,
        count: sessionIds.size,
        sessions: Array.from(sessionIds),
      });
    });

    return result.sort((a, b) => b.count - a.count);
  }

  /**
   * Get components by session ID with their custom names
   */
  getSessionComponents(sessionId: string): FigmaNode[] | undefined {
    return this.sessionComponents.get(sessionId);
  }

  /**
   * Update component custom name
   */
  updateComponentCustomName(
    sessionId: string,
    componentId: string,
    newCustomName: string
  ): boolean {
    const components = this.sessionComponents.get(sessionId);
    if (!components) return false;

    const component = this.findComponentById(components, componentId);
    if (!component) return false;

    // Remove old name from index
    if (component.customName) {
      this.removeComponentFromIndex(sessionId, component);
    }

    // Update component
    component.customName = newCustomName;

    // Add new name to index
    if (newCustomName) {
      const normalizedName = this.normalizeCustomName(newCustomName);

      if (!this.nameIndex.has(normalizedName)) {
        this.nameIndex.set(normalizedName, new Set());
      }
      this.nameIndex.get(normalizedName)!.add(sessionId);

      if (!this.componentsByName.has(normalizedName)) {
        this.componentsByName.set(normalizedName, new Map());
      }
      this.componentsByName.get(normalizedName)!.set(sessionId, component);
    }

    logger.info("Updated component custom name", {
      sessionId,
      componentId,
      newCustomName,
    });

    return true;
  }

  /**
   * Private helper methods
   */
  private normalizeCustomName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, " ");
  }

  private isPartialMatch(query: string, indexedName: string): boolean {
    return indexedName.includes(query) || query.includes(indexedName);
  }

  private calculateSimilarity(query: string, indexedName: string): number {
    const maxLength = Math.max(query.length, indexedName.length);
    const commonLength = this.getCommonSubstringLength(query, indexedName);
    return commonLength / maxLength;
  }

  private getCommonSubstringLength(str1: string, str2: string): number {
    let maxLength = 0;
    for (let i = 0; i < str1.length; i++) {
      for (let j = 0; j < str2.length; j++) {
        let length = 0;
        while (
          i + length < str1.length &&
          j + length < str2.length &&
          str1[i + length] === str2[j + length]
        ) {
          length++;
        }
        maxLength = Math.max(maxLength, length);
      }
    }
    return maxLength;
  }

  private removeComponentsFromIndex(
    sessionId: string,
    components: FigmaNode[]
  ): void {
    components.forEach((component) => {
      this.removeComponentFromIndex(sessionId, component);
      if (component.children) {
        this.removeComponentsFromIndex(sessionId, component.children);
      }
    });
  }

  private removeComponentFromIndex(
    sessionId: string,
    component: FigmaNode
  ): void {
    if (component.customName) {
      const normalizedName = this.normalizeCustomName(component.customName);

      const sessionIds = this.nameIndex.get(normalizedName);
      if (sessionIds) {
        sessionIds.delete(sessionId);
        if (sessionIds.size === 0) {
          this.nameIndex.delete(normalizedName);
        }
      }

      const componentsMap = this.componentsByName.get(normalizedName);
      if (componentsMap) {
        componentsMap.delete(sessionId);
        if (componentsMap.size === 0) {
          this.componentsByName.delete(normalizedName);
        }
      }
    }
  }

  private findComponentById(
    components: FigmaNode[],
    componentId: string
  ): FigmaNode | undefined {
    for (const component of components) {
      if (component.id === componentId) {
        return component;
      }
      if (component.children) {
        const found = this.findComponentById(component.children, componentId);
        if (found) return found;
      }
    }
    return undefined;
  }
}

export default new ComponentNameIndex();
