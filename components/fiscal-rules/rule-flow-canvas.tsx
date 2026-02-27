"use client"

import {
	Background,
	Controls,
	type Edge,
	MiniMap,
	type Node,
	ReactFlow,
	useEdgesState,
	useNodesState,
} from "@xyflow/react"
import dagre from "dagre"
import { useCallback, useEffect, useMemo } from "react"
import "@xyflow/react/dist/style.css"
import { BranchNode } from "./branch-node"
import { ConditionNode } from "./condition-node"
import { RuleNode } from "./rule-node"
import { TaskNode } from "./task-node"

const nodeTypes = {
	ruleNode: RuleNode,
	conditionNode: ConditionNode,
	branchNode: BranchNode,
	taskNode: TaskNode,
}

interface FiscalRule {
	_id: string
	nom: string
	description?: string
	isActive: boolean
	conditions: Array<{ champ: string; operateur: string; valeur?: unknown }>
	branches: Array<{
		nom: string
		conditions: Array<{ champ: string; operateur: string; valeur?: unknown }>
		taches: Array<{
			nom: string
			categorie?: string
			cerfa?: string
			repeat?: { frequence: string; moisExclus?: number[] }
		}>
	}>
}

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
	const g = new dagre.graphlib.Graph()
	g.setDefaultEdgeLabel(() => ({}))
	g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 60 })

	for (const node of nodes) {
		g.setNode(node.id, { width: 260, height: 80 })
	}
	for (const edge of edges) {
		g.setEdge(edge.source, edge.target)
	}

	dagre.layout(g)

	const layoutedNodes = nodes.map((node) => {
		const pos = g.node(node.id)
		return {
			...node,
			position: { x: pos.x - 130, y: pos.y - 40 },
		}
	})

	return { nodes: layoutedNodes, edges }
}

function buildNodesAndEdges(rule: FiscalRule): { nodes: Node[]; edges: Edge[] } {
	const nodes: Node[] = []
	const edges: Edge[] = []

	// Root node
	const ruleId = "rule"
	nodes.push({
		id: ruleId,
		type: "ruleNode",
		position: { x: 0, y: 0 },
		data: { nom: rule.nom, description: rule.description, isActive: rule.isActive },
	})

	// Root conditions
	if (rule.conditions.length > 0) {
		const condId = "conditions-root"
		nodes.push({
			id: condId,
			type: "conditionNode",
			position: { x: 0, y: 0 },
			data: { conditions: rule.conditions },
		})
		edges.push({
			id: `e-${ruleId}-${condId}`,
			source: ruleId,
			target: condId,
			animated: true,
			style: { stroke: "#063238" },
		})

		// Branches connect from conditions
		for (let bi = 0; bi < rule.branches.length; bi++) {
			const branch = rule.branches[bi]
			const branchId = `branch-${bi}`
			nodes.push({
				id: branchId,
				type: "branchNode",
				position: { x: 0, y: 0 },
				data: { nom: branch.nom, conditions: branch.conditions },
			})
			edges.push({
				id: `e-${condId}-${branchId}`,
				source: condId,
				target: branchId,
				animated: true,
				style: { stroke: "#6242FB" },
			})

			// Tasks
			for (let ti = 0; ti < branch.taches.length; ti++) {
				const task = branch.taches[ti]
				const taskId = `task-${bi}-${ti}`
				nodes.push({
					id: taskId,
					type: "taskNode",
					position: { x: 0, y: 0 },
					data: {
						nom: task.nom,
						categorie: task.categorie,
						cerfa: task.cerfa,
						hasRepeat: !!task.repeat,
					},
				})
				edges.push({
					id: `e-${branchId}-${taskId}`,
					source: branchId,
					target: taskId,
					style: { stroke: "#9ca3af" },
				})
			}
		}
	} else {
		// No root conditions — branches connect directly from rule
		for (let bi = 0; bi < rule.branches.length; bi++) {
			const branch = rule.branches[bi]
			const branchId = `branch-${bi}`
			nodes.push({
				id: branchId,
				type: "branchNode",
				position: { x: 0, y: 0 },
				data: { nom: branch.nom, conditions: branch.conditions },
			})
			edges.push({
				id: `e-${ruleId}-${branchId}`,
				source: ruleId,
				target: branchId,
				animated: true,
				style: { stroke: "#6242FB" },
			})

			for (let ti = 0; ti < branch.taches.length; ti++) {
				const task = branch.taches[ti]
				const taskId = `task-${bi}-${ti}`
				nodes.push({
					id: taskId,
					type: "taskNode",
					position: { x: 0, y: 0 },
					data: {
						nom: task.nom,
						categorie: task.categorie,
						cerfa: task.cerfa,
						hasRepeat: !!task.repeat,
					},
				})
				edges.push({
					id: `e-${branchId}-${taskId}`,
					source: branchId,
					target: taskId,
					style: { stroke: "#9ca3af" },
				})
			}
		}
	}

	return getLayoutedElements(nodes, edges)
}

interface RuleFlowCanvasProps {
	rule: FiscalRule
}

export function RuleFlowCanvas({ rule }: RuleFlowCanvasProps) {
	const initial = useMemo(() => buildNodesAndEdges(rule), [rule])
	const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
	const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)

	useEffect(() => {
		const { nodes: n, edges: e } = buildNodesAndEdges(rule)
		setNodes(n)
		setEdges(e)
	}, [rule, setNodes, setEdges])

	const onInit = useCallback(() => {}, [])

	return (
		<div className="h-full w-full">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onInit={onInit}
				nodeTypes={nodeTypes}
				fitView
				fitViewOptions={{ padding: 0.2 }}
				minZoom={0.3}
				maxZoom={1.5}
				proOptions={{ hideAttribution: true }}
			>
				<Background color="#e5e7eb" gap={20} />
				<Controls />
				<MiniMap
					nodeStrokeColor="#2E6965"
					nodeColor="#F4F5F3"
					className="!bg-white !border !rounded-lg"
				/>
			</ReactFlow>
		</div>
	)
}
