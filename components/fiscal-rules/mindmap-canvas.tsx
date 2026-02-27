"use client"

import {
	addEdge,
	Background,
	type Connection,
	Controls,
	type Edge,
	MiniMap,
	type Node,
	type NodeMouseHandler,
	Panel,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	useReactFlow,
} from "@xyflow/react"
import dagre from "dagre"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "@xyflow/react/dist/style.css"
import { useMutation, useQuery } from "convex/react"
import {
	ArrowDownFromLine,
	Ban,
	CircleDot,
	FolderTree,
	GitBranchPlus,
	LayoutGrid,
	ListChecks,
	Loader2,
	RotateCcw,
	Save,
	Sparkles,
	Wand2,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { MindmapConditionNode } from "./mindmap-condition-node"
import { MindmapGroupNode } from "./mindmap-group-node"
import { MindmapNothingNode } from "./mindmap-nothing-node"
import { MindmapStartNode } from "./mindmap-start-node"
import { MindmapTaskNode } from "./mindmap-task-node"
import { NodeEditorPanel } from "./node-editor-panel"

const nodeTypes = {
	startNode: MindmapStartNode,
	groupNode: MindmapGroupNode,
	conditionNode: MindmapConditionNode,
	taskNode: MindmapTaskNode,
	nothingNode: MindmapNothingNode,
}

const GROUP_FILTERS = [
	{ value: "all", label: "Tout afficher" },
	{ value: "IR", label: "IR" },
	{ value: "IS", label: "IS" },
	{ value: "TVA", label: "TVA" },
	{ value: "CFE", label: "CFE" },
	{ value: "CVAE", label: "CVAE" },
	{ value: "TAXES", label: "Taxes" },
]

/** Node dimensions by type for dagre layout */
const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
	startNode: { width: 220, height: 60 },
	groupNode: { width: 180, height: 55 },
	conditionNode: { width: 260, height: 75 },
	taskNode: { width: 280, height: 95 },
	nothingNode: { width: 140, height: 40 },
}

/** Apply dagre tree layout — probability-tree style, top→bottom */
function applyTreeLayout(nodes: Node[], edges: Edge[]): Node[] {
	if (nodes.length === 0) return nodes

	const g = new dagre.graphlib.Graph()
	g.setGraph({
		rankdir: "TB",
		nodesep: 120,
		ranksep: 130,
		marginx: 40,
		marginy: 40,
	})
	g.setDefaultEdgeLabel(() => ({}))

	for (const node of nodes) {
		const dim = NODE_DIMENSIONS[node.type ?? "startNode"] ?? { width: 200, height: 60 }
		g.setNode(node.id, { width: dim.width, height: dim.height })
	}

	for (const edge of edges) {
		g.setEdge(edge.source, edge.target)
	}

	dagre.layout(g)

	return nodes.map((node) => {
		const pos = g.node(node.id)
		if (!pos) return node
		const dim = NODE_DIMENSIONS[node.type ?? "startNode"] ?? { width: 200, height: 60 }
		return {
			...node,
			position: {
				x: pos.x - dim.width / 2,
				y: pos.y - dim.height / 2,
			},
		}
	})
}

function generateId() {
	return `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function MindmapCanvas() {
	return (
		<ReactFlowProvider>
			<MindmapCanvasInner />
		</ReactFlowProvider>
	)
}

function MindmapCanvasInner() {
	const { role: userRole } = useCurrentUser()
	const isAdmin = userRole === "admin"

	const mindmap = useQuery(api.fiscalMindmap.get)
	const saveMutation = useMutation(api.fiscalMindmap.save)
	const seedMutation = useMutation(api.fiscalMindmap.seed)
	const resetMutation = useMutation(api.fiscalMindmap.reset)

	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
	const [saving, setSaving] = useState(false)
	const [filter, setFilter] = useState("all")
	const [hasChanges, setHasChanges] = useState(false)
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState("edit")
	const initializedRef = useRef(false)

	// Load mindmap data — apply tree layout on first load
	useEffect(() => {
		if (mindmap && !initializedRef.current) {
			const rawNodes = mindmap.nodes as Node[]
			const rawEdges = mindmap.edges as Edge[]
			setNodes(applyTreeLayout(rawNodes, rawEdges))
			setEdges(rawEdges)
			initializedRef.current = true
		}
	}, [mindmap, setNodes, setEdges])

	// Selected node object
	const selectedNode = useMemo(
		() => (selectedNodeId ? (nodes.find((n) => n.id === selectedNodeId) ?? null) : null),
		[selectedNodeId, nodes],
	)

	// Track changes
	const handleNodesChange = useCallback(
		(changes: Parameters<typeof onNodesChange>[0]) => {
			onNodesChange(changes)
			if (initializedRef.current) setHasChanges(true)
		},
		[onNodesChange],
	)

	const handleEdgesChange = useCallback(
		(changes: Parameters<typeof onEdgesChange>[0]) => {
			onEdgesChange(changes)
			if (initializedRef.current) setHasChanges(true)
		},
		[onEdgesChange],
	)

	// Node click → select + open editor
	const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
		setSelectedNodeId(node.id)
		setActiveTab("edit")
	}, [])

	// Pane click → deselect
	const onPaneClick = useCallback(() => {
		setSelectedNodeId(null)
	}, [])

	// Update node data from editor
	const updateNodeData = useCallback(
		(nodeId: string, newData: Record<string, unknown>) => {
			setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: newData } : n)))
			setHasChanges(true)
		},
		[setNodes],
	)

	// Delete node + connected edges
	const deleteNode = useCallback(
		(nodeId: string) => {
			setNodes((nds) => nds.filter((n) => n.id !== nodeId))
			setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
			setSelectedNodeId(null)
			setHasChanges(true)
		},
		[setNodes, setEdges],
	)

	// Close editor panel
	const closeEditor = useCallback(() => {
		setSelectedNodeId(null)
	}, [])

	// Connect edges
	const onConnect = useCallback(
		(connection: Connection) => {
			const sourceNode = nodes.find((n) => n.id === connection.source)
			const isOui = connection.sourceHandle === "oui"
			const isNon = connection.sourceHandle === "non"
			const isCondition = sourceNode?.type === "conditionNode"

			const edge: Edge = {
				...connection,
				id: `e_${Date.now()}`,
				animated: isCondition,
				label: isOui ? "OUI" : isNon ? "NON" : undefined,
				style: isOui
					? { stroke: "#10b981", strokeWidth: 2 }
					: isNon
						? { stroke: "#ef4444", strokeWidth: 2 }
						: { stroke: "#063238", strokeWidth: 1.5 },
				labelStyle: isOui
					? { fill: "#10b981", fontWeight: 700, fontSize: 10 }
					: isNon
						? { fill: "#ef4444", fontWeight: 700, fontSize: 10 }
						: undefined,
			} as Edge

			setEdges((eds) => addEdge(edge, eds))
			setHasChanges(true)
		},
		[nodes, setEdges],
	)

	// Save
	const handleSave = useCallback(async () => {
		setSaving(true)
		try {
			const cleanNodes = nodes.map((n) => ({
				id: n.id,
				type: n.type ?? "startNode",
				position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
				data: n.data,
			}))
			const cleanEdges = edges.map((e) => ({
				id: e.id,
				source: e.source,
				target: e.target,
				sourceHandle: e.sourceHandle ?? undefined,
				label: typeof e.label === "string" ? e.label : undefined,
				animated: e.animated ?? undefined,
				style: e.style ?? undefined,
			}))

			await saveMutation({ nodes: cleanNodes, edges: cleanEdges })
			setHasChanges(false)
			toast.success("Mind map sauvegardée")
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur de sauvegarde")
		} finally {
			setSaving(false)
		}
	}, [nodes, edges, saveMutation])

	// Seed / Reset
	const handleSeed = useCallback(async () => {
		try {
			const result = await seedMutation()
			toast.success(`Mind map initialisée (${result.nodes} noeuds, ${result.edges} arêtes)`)
			initializedRef.current = false
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur d'initialisation")
		}
	}, [seedMutation])

	const handleReset = useCallback(async () => {
		try {
			const result = await resetMutation()
			toast.success(`Mind map réinitialisée (${result.nodes} noeuds, ${result.edges} arêtes)`)
			initializedRef.current = false
		} catch (err: unknown) {
			toast.error((err as Error).message ?? "Erreur de réinitialisation")
		}
	}, [resetMutation])

	// Auto-layout — reorganize the tree
	const { fitView } = useReactFlow()
	const handleAutoLayout = useCallback(() => {
		setNodes((nds) => {
			const laid = applyTreeLayout(nds, edges)
			setTimeout(() => fitView({ padding: 0.15 }), 50)
			return laid
		})
		setHasChanges(true)
	}, [edges, setNodes, fitView])

	// Add node helpers
	const addNode = useCallback(
		(type: string, data: Record<string, unknown>) => {
			const id = generateId()
			const newNode: Node = {
				id,
				type,
				position: { x: 400 + Math.random() * 100, y: 300 + Math.random() * 100 },
				data,
			}
			setNodes((nds) => [...nds, newNode])
			setHasChanges(true)
			setSelectedNodeId(id)
			setActiveTab("edit")
		},
		[setNodes],
	)

	// Preview state
	const clients = useQuery(api.clients.list, {})
	const [previewClientId, setPreviewClientId] = useState<string>("")
	const [previewExercice, setPreviewExercice] = useState(new Date().getFullYear())
	const previewResult = useQuery(
		api.fiscalMindmap.preview,
		previewClientId
			? { clientId: previewClientId as Id<"clients">, exercice: previewExercice }
			: "skip",
	)

	// Filter nodes for display
	const filteredNodes = useMemo(() => {
		if (filter === "all") return nodes
		const groupNodeIds = new Set<string>()
		const visibleIds = new Set<string>()

		for (const node of nodes) {
			if (node.type === "startNode") {
				visibleIds.add(node.id)
			}
			if (node.type === "groupNode" && (node.data as { groupe?: string }).groupe === filter) {
				groupNodeIds.add(node.id)
				visibleIds.add(node.id)
			}
		}

		const queue = [...groupNodeIds]
		const edgeMap = new Map<string, string[]>()
		for (const e of edges) {
			const list = edgeMap.get(e.source) ?? []
			list.push(e.target)
			edgeMap.set(e.source, list)
		}

		while (queue.length > 0) {
			const nodeId = queue.shift()!
			const targets = edgeMap.get(nodeId) ?? []
			for (const t of targets) {
				if (!visibleIds.has(t)) {
					visibleIds.add(t)
					queue.push(t)
				}
			}
		}

		for (const e of edges) {
			if (visibleIds.has(e.source) && visibleIds.has(e.target)) continue
			if (e.source === "start" || visibleIds.has(e.source)) {
				visibleIds.add(e.target)
			}
		}

		return nodes.filter((n) => visibleIds.has(n.id))
	}, [nodes, edges, filter])

	const filteredEdges = useMemo(() => {
		const visibleIds = new Set(filteredNodes.map((n) => n.id))
		return edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
	}, [filteredNodes, edges])

	// Loading state
	if (mindmap === undefined) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="space-y-4 text-center">
					<Skeleton className="mx-auto h-12 w-48" />
					<Skeleton className="mx-auto h-4 w-72" />
				</div>
			</div>
		)
	}

	return (
		<div className="h-full w-full flex">
			{/* Canvas */}
			<div className="flex-1 relative">
				<ReactFlow
					nodes={filteredNodes}
					edges={filteredEdges}
					onNodesChange={handleNodesChange}
					onEdgesChange={handleEdgesChange}
					onConnect={onConnect}
					onNodeClick={onNodeClick}
					onPaneClick={onPaneClick}
					nodeTypes={nodeTypes}
					fitView
					fitViewOptions={{ padding: 0.15 }}
					minZoom={0.1}
					maxZoom={2}
					proOptions={{ hideAttribution: true }}
					deleteKeyCode={isAdmin ? ["Backspace", "Delete"] : []}
					nodesDraggable={isAdmin}
					nodesConnectable={isAdmin}
				>
					<Background color="#d1d5db" gap={24} size={1.5} />
					<Controls className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm" />
					<MiniMap
						nodeStrokeColor="#2E6965"
						nodeColor="#F4F5F3"
						className="!bg-white !border !border-gray-200 !rounded-lg"
					/>

					{/* Toolbar */}
					<Panel position="top-left" className="flex flex-col gap-2">
						<div className="flex items-center gap-2 rounded-lg border bg-white p-2 shadow-sm">
							<Select value={filter} onValueChange={setFilter}>
								<SelectTrigger className="h-8 w-[140px] text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{GROUP_FILTERS.map((f) => (
										<SelectItem key={f.value} value={f.value}>
											{f.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{isAdmin && (
								<>
									<div className="h-6 w-px bg-gray-200" />
									<Button
										variant="ghost"
										size="sm"
										className="h-8 gap-1 text-xs"
										onClick={() =>
											addNode("conditionNode", {
												champ: "categorieFiscale",
												operateur: "equals",
												valeur: "IS",
											})
										}
									>
										<GitBranchPlus className="h-3.5 w-3.5" />
										Condition
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 gap-1 text-xs"
										onClick={() =>
											addNode("groupNode", { label: "Nouveau groupe", groupe: "TAXES" })
										}
									>
										<FolderTree className="h-3.5 w-3.5" />
										Groupe
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 gap-1 text-xs"
										onClick={() =>
											addNode("taskNode", { nom: "Nouvelle tâche", categorie: "TAXES" })
										}
									>
										<ListChecks className="h-3.5 w-3.5" />
										Tâche
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 gap-1 text-xs"
										onClick={() => addNode("nothingNode", {})}
									>
										<Ban className="h-3.5 w-3.5" />
										Rien
									</Button>
									<div className="h-6 w-px bg-gray-200" />
									<Button
										variant="ghost"
										size="sm"
										className="h-8 gap-1 text-xs"
										onClick={handleAutoLayout}
									>
										<LayoutGrid className="h-3.5 w-3.5" />
										Réorganiser
									</Button>
									<div className="h-6 w-px bg-gray-200" />
									<Button
										size="sm"
										className="h-8 gap-1 text-xs"
										disabled={saving || !hasChanges}
										onClick={handleSave}
									>
										{saving ? (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										) : (
											<Save className="h-3.5 w-3.5" />
										)}
										Sauvegarder
									</Button>
									{nodes.length === 0 && (
										<Button
											variant="outline"
											size="sm"
											className="h-8 gap-1 text-xs border-[#6242FB] text-[#6242FB] hover:bg-[#6242FB]/5"
											onClick={handleSeed}
										>
											<Wand2 className="h-3.5 w-3.5" />
											Initialiser
										</Button>
									)}
									{nodes.length > 0 && (
										<Button
											variant="ghost"
											size="sm"
											className="h-8 gap-1 text-xs text-muted-foreground"
											onClick={handleReset}
										>
											<RotateCcw className="h-3.5 w-3.5" />
											Réinitialiser
										</Button>
									)}
								</>
							)}
						</div>
					</Panel>

					{/* Legend */}
					<Panel position="bottom-left">
						<div className="flex items-center gap-3 rounded-lg border bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
							<div className="flex items-center gap-1.5">
								<CircleDot className="h-3 w-3 text-primary" />
								<span className="text-[10px] text-muted-foreground">Départ</span>
							</div>
							<div className="flex items-center gap-1.5">
								<FolderTree className="h-3 w-3 text-[#6242FB]" />
								<span className="text-[10px] text-muted-foreground">Groupe</span>
							</div>
							<div className="flex items-center gap-1.5">
								<GitBranchPlus className="h-3 w-3 text-[#063238]" />
								<span className="text-[10px] text-muted-foreground">Condition</span>
							</div>
							<div className="flex items-center gap-1.5">
								<ListChecks className="h-3 w-3 text-[#2E6965]" />
								<span className="text-[10px] text-muted-foreground">Tâche</span>
							</div>
							<div className="flex items-center gap-1.5">
								<Ban className="h-3 w-3 text-gray-400" />
								<span className="text-[10px] text-muted-foreground">Rien</span>
							</div>
							<div className="h-4 w-px bg-gray-200" />
							<div className="flex items-center gap-1.5">
								<div className="h-2 w-4 rounded-full bg-emerald-500" />
								<span className="text-[10px] text-muted-foreground">OUI</span>
							</div>
							<div className="flex items-center gap-1.5">
								<div className="h-2 w-4 rounded-full bg-red-400" />
								<span className="text-[10px] text-muted-foreground">NON</span>
							</div>
						</div>
					</Panel>
				</ReactFlow>
			</div>

			{/* Side Panel */}
			<div className="w-[340px] border-l bg-white flex flex-col shrink-0">
				<Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
					<TabsList className="w-full justify-start rounded-none border-b bg-transparent px-2 pt-2">
						<TabsTrigger
							value="edit"
							className="text-xs data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
						>
							Éditer
							{selectedNode && (
								<span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary inline-block" />
							)}
						</TabsTrigger>
						<TabsTrigger
							value="preview"
							className="text-xs data-[state=active]:bg-[#6242FB]/5 data-[state=active]:text-[#6242FB]"
						>
							Simuler
						</TabsTrigger>
					</TabsList>

					<TabsContent value="edit" className="flex-1 mt-0 overflow-hidden">
						<NodeEditorPanel
							node={selectedNode}
							onUpdateData={updateNodeData}
							onDeleteNode={deleteNode}
							onClose={closeEditor}
						/>
					</TabsContent>

					<TabsContent value="preview" className="flex-1 mt-0 overflow-y-auto p-4">
						<div className="space-y-3">
							<div className="flex items-center gap-2 mb-2">
								<Sparkles className="h-4 w-4 text-[#6242FB]" />
								<span className="text-xs font-medium">Simulation</span>
							</div>

							<Select value={previewClientId} onValueChange={setPreviewClientId}>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue placeholder="Choisir un client..." />
								</SelectTrigger>
								<SelectContent>
									{(clients ?? []).map((c) => (
										<SelectItem key={c._id} value={c._id}>
											{c.raisonSociale}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select
								value={String(previewExercice)}
								onValueChange={(v) => setPreviewExercice(Number(v))}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[2024, 2025, 2026].map((y) => (
										<SelectItem key={y} value={String(y)}>
											Exercice {y}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{previewResult !== undefined && previewClientId && (
								<div className="space-y-1 pt-2 border-t">
									{previewResult.length === 0 ? (
										<p className="text-xs text-muted-foreground italic py-2">
											Aucune tâche générée
										</p>
									) : (
										<>
											<p className="text-[10px] text-muted-foreground mb-1">
												{previewResult.length} tâche{previewResult.length > 1 ? "s" : ""} générée
												{previewResult.length > 1 ? "s" : ""}
											</p>
											{previewResult.map((t, i) => (
												<div key={t.nom + String(i)} className="flex items-center gap-1.5 py-0.5">
													<ArrowDownFromLine className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
													<span className="text-[10px] leading-tight">{t.nom}</span>
													{t.categorie && (
														<Badge
															variant="outline"
															className="text-[8px] px-1 py-0 ml-auto shrink-0"
														>
															{t.categorie}
														</Badge>
													)}
												</div>
											))}
										</>
									)}
								</div>
							)}
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	)
}
