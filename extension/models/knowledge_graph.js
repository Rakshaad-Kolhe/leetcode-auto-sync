/**
 * Domain model for Knowledge Graph network nodes and relationships.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class KnowledgeNode {
    /**
     * @param {Object} options
     * @param {string} options.id
     * @param {string} options.label
     * @param {string} options.type - 'Problem'|'Pattern'|'Algorithm'|'DataStructure'|'Company'|'Difficulty'|'Roadmap'|'Revision'
     * @param {Object} options.metadata
     */
    constructor(options = {}) {
      this.id = options.id || "";
      this.label = options.label || "";
      this.type = options.type || "Problem";
      this.metadata = options.metadata || {};
    }

    toJSONObject() {
      return {
        id: this.id,
        label: this.label,
        type: this.type,
        metadata: { ...this.metadata }
      };
    }

    static fromJSON(json) {
      if (!json) return new KnowledgeNode();
      return new KnowledgeNode(json);
    }
  }

  class KnowledgeEdge {
    /**
     * @param {Object} options
     * @param {string} options.source
     * @param {string} options.target
     * @param {string} options.relation - e.g. 'USES_PATTERN', 'TARGETED_BY_COMPANY', 'BELONGS_TO'
     */
    constructor(options = {}) {
      this.source = options.source || "";
      this.target = options.target || "";
      this.relation = options.relation || "CONNECTED_TO";
    }

    toJSONObject() {
      return {
        source: this.source,
        target: this.target,
        relation: this.relation
      };
    }

    static fromJSON(json) {
      if (!json) return new KnowledgeEdge();
      return new KnowledgeEdge(json);
    }
  }

  class KnowledgeGraph {
    constructor(options = {}) {
      this.nodes = Array.isArray(options.nodes)
        ? options.nodes.map((n) => (n instanceof KnowledgeNode ? n : KnowledgeNode.fromJSON(n)))
        : [];
      this.edges = Array.isArray(options.edges)
        ? options.edges.map((e) => (e instanceof KnowledgeEdge ? e : KnowledgeEdge.fromJSON(e)))
        : [];
    }

    toJSONObject() {
      return {
        nodes: this.nodes.map((n) => n.toJSONObject()),
        edges: this.edges.map((e) => e.toJSONObject())
      };
    }

    static fromJSON(json) {
      if (!json) return new KnowledgeGraph();
      return new KnowledgeGraph(json);
    }
  }

  LeetCodeAutoSync.KnowledgeNode = KnowledgeNode;
  LeetCodeAutoSync.KnowledgeEdge = KnowledgeEdge;
  LeetCodeAutoSync.KnowledgeGraph = KnowledgeGraph;

})(typeof self !== "undefined" ? self : this);
