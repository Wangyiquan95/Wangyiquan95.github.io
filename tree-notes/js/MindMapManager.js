class MindMapManager {
    constructor() {
        this.nodes = new Map(); // Map of node ID to MindMapNode
        this.stickyNotes = new Map(); // Map of sticky note ID to StickyNote
        this.canvas = null;
        this.ctx = null;
        this.mode = 'move'; // 'move', 'connect', 'delete'
        this.selectedNodes = []; // For connection mode
        this.currentEditingNode = null;
        
        this.init();
    }

    init() {
        this.canvas = document.getElementById('connectionCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        this.setupEventListeners();
    }

    setupCanvas() {
        const container = document.getElementById('canvasContainer');
        this.resizeCanvas();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    resizeCanvas() {
        const container = document.getElementById('canvasContainer');
        const rect = container.getBoundingClientRect();
        
        // Set canvas size
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.redrawConnections();
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('addNodeBtn').addEventListener('click', () => {
            this.addNode();
        });

        document.getElementById('addStickyBtn').addEventListener('click', () => {
            this.addStickyNote();
        });

        document.getElementById('connectModeBtn').addEventListener('click', () => {
            this.setMode('connect');
        });

        document.getElementById('deleteModeBtn').addEventListener('click', () => {
            this.setMode('delete');
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveToStorage();
        });

        document.getElementById('loadBtn').addEventListener('click', () => {
            this.loadFromFile();
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearAll();
        });

        document.getElementById('fitViewBtn').addEventListener('click', () => {
            this.fitView();
        });

        // Export button functionality
        document.getElementById('exportBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showExportMenu(e);
        });

        // Modal handlers
        document.getElementById('saveEditBtn').addEventListener('click', () => {
            this.saveEdit();
        });

        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            this.cancelEdit();
        });

        // Canvas click handler for connection deletion
        this.canvas.addEventListener('click', (e) => {
            if (this.mode === 'delete') {
                this.handleCanvasClick(e);
            }
        });

        // Color picker
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
                e.target.classList.add('selected');
            });
        });

        // Container interactions
        const container = document.getElementById('canvasContainer');
        
        // Double-click to create new node
        container.addEventListener('dblclick', (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Check if we clicked on empty space (not on a node)
            const clickedElement = document.elementFromPoint(e.clientX, e.clientY);
            if (!clickedElement.closest('.mind-map-node')) {
                this.addNode('New Idea', x - 60, y - 20); // Center the node on click point
            }
        });

        // Container click to deselect and exit modes
        container.addEventListener('click', (e) => {
            const clickedElement = document.elementFromPoint(e.clientX, e.clientY);
            const isClickOnEmptySpace = !clickedElement.closest('.mind-map-node');
            
            if (isClickOnEmptySpace) {
                if (this.mode === 'connect') {
                    this.clearSelection();
                }
                if (this.mode !== 'move') {
                    this.setMode('move');
                }
            }
        });
    }

    setMode(newMode) {
        // If clicking the same mode button, toggle back to move mode
        if (this.mode === newMode && newMode !== 'move') {
            newMode = 'move';
        }
        
        this.mode = newMode;
        this.clearSelection();
        
        // Update UI
        const modeIndicator = document.getElementById('modeIndicator');
        const buttons = {
            'move': { text: 'Move Mode', btn: null },
            'connect': { text: 'Connect Mode - Click nodes to link them', btn: 'connectModeBtn' },
            'delete': { text: 'Delete Mode - Click nodes to delete them', btn: 'deleteModeBtn' }
        };

        modeIndicator.textContent = buttons[newMode].text;
        
        // Update button states
        document.querySelectorAll('.toolbar .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (buttons[newMode].btn) {
            document.getElementById(buttons[newMode].btn).classList.add('active');
        }

        // Update cursor
        const container = document.getElementById('canvasContainer');
        container.style.cursor = newMode === 'delete' ? 'crosshair' : 'default';
    }

    addNode(text = 'New Node', x = null, y = null, color = '#3b82f6') {
        const container = document.getElementById('canvasContainer');
        const rect = container.getBoundingClientRect();
        
        // Default position if not specified
        if (x === null) x = Math.random() * (rect.width - 150) + 50;
        if (y === null) y = Math.random() * (rect.height - 100) + 50;

        const node = new MindMapNode(text, x, y, color);
        this.nodes.set(node.id, node);

        const mindMapArea = document.getElementById('mindMapArea');
        const emptyState = document.getElementById('emptyState');
        
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        mindMapArea.appendChild(node.render());
        
        // Automatically edit new nodes
        setTimeout(() => {
            this.editNode(node);
        }, 100);

        return node;
    }

    addStickyNote(x = null, y = null) {
        const container = document.getElementById('canvasContainer');
        const rect = container.getBoundingClientRect();
        
        // Default position if not specified
        if (x === null) x = Math.random() * (rect.width - 300) + 50;
        if (y === null) y = Math.random() * (rect.height - 250) + 50;

        const note = new StickyNote(x, y);
        this.stickyNotes.set(note.id, note);

        const mindMapArea = document.getElementById('mindMapArea');
        const emptyState = document.getElementById('emptyState');
        
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        mindMapArea.appendChild(note.render());
        
        // Automatically edit new sticky notes
        setTimeout(() => {
            note.startEditing();
        }, 100);

        return note;
    }

    deleteStickyNote(note) {
        if (this.stickyNotes.has(note.id)) {
            if (note.element && note.element.parentNode) {
                note.element.parentNode.removeChild(note.element);
            }
            this.stickyNotes.delete(note.id);
            this.autoSave();
        }
    }

    deleteNode(node) {
        // Remove all connections to this node
        this.nodes.forEach(otherNode => {
            if (otherNode.hasConnection(node.id)) {
                otherNode.removeConnection(node.id);
            }
        });

        // Remove the node
        if (node.element && node.element.parentNode) {
            node.element.parentNode.removeChild(node.element);
        }
        
        this.nodes.delete(node.id);
        this.redrawConnections();

        // Show empty state if no nodes left
        if (this.nodes.size === 0) {
            const emptyState = document.getElementById('emptyState');
            if (emptyState) {
                emptyState.style.display = 'block';
            }
        }

        // Auto-exit delete mode after deleting a node
        this.setMode('move');
    }

    handleNodeClick(node) {
        if (this.mode !== 'connect') return;

        if (this.selectedNodes.length === 0) {
            // First node selection
            this.selectedNodes.push(node);
            this.highlightNode(node, true);
        } else if (this.selectedNodes.length === 1) {
            const firstNode = this.selectedNodes[0];
            if (firstNode.id === node.id) {
                // Clicked same node, deselect
                this.clearSelection();
            } else {
                // Create connection
                this.createConnection(firstNode, node);
                this.clearSelection();
                // Auto-exit connect mode after successful connection
                this.setMode('move');
            }
        }
    }

    createConnection(node1, node2) {
        node1.addConnection(node2.id);
        node2.addConnection(node1.id);
        this.redrawConnections();
    }

    handleCanvasClick(e) {
        if (this.mode !== 'delete') return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicked on a connection line
        this.nodes.forEach(node => {
            node.connections.forEach(connectionId => {
                const connectedNode = this.nodes.get(connectionId);
                if (connectedNode && this.isPointOnLine(x, y, node.getCenter(), connectedNode.getCenter())) {
                    // Remove connection
                    node.removeConnection(connectionId);
                    connectedNode.removeConnection(node.id);
                    this.redrawConnections();
                }
            });
        });
    }

    isPointOnLine(px, py, p1, p2, tolerance = 8) {
        const distance = this.distanceFromPointToLine(px, py, p1.x, p1.y, p2.x, p2.y);
        return distance <= tolerance;
    }

    distanceFromPointToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    clearSelection() {
        this.selectedNodes.forEach(node => {
            this.highlightNode(node, false);
        });
        this.selectedNodes = [];
    }

    highlightNode(node, highlight) {
        if (!node.element) return;
        
        if (highlight) {
            node.element.style.boxShadow = '0 0 20px #fbbf24';
            node.element.style.border = '3px solid #fbbf24';
        } else {
            node.element.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            node.element.style.border = `2px solid ${node.darkenColor(node.color)}`;
        }
    }

    redrawConnections() {
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw all connections with enhanced styling
        const drawnConnections = new Set();
        
        this.nodes.forEach(node => {
            node.connections.forEach(connectionId => {
                const connectedNode = this.nodes.get(connectionId);
                if (!connectedNode) return;

                // Avoid drawing duplicate lines
                const connectionKey = [node.id, connectionId].sort().join('-');
                if (drawnConnections.has(connectionKey)) return;
                drawnConnections.add(connectionKey);

                const center1 = node.getCenter();
                const center2 = connectedNode.getCenter();

                // Create gradient for the connection line
                const gradient = this.ctx.createLinearGradient(center1.x, center1.y, center2.x, center2.y);
                gradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
                gradient.addColorStop(0.5, 'rgba(118, 75, 162, 0.6)');
                gradient.addColorStop(1, 'rgba(240, 147, 251, 0.8)');

                // Draw connection with curved line
                this.ctx.beginPath();
                this.ctx.lineWidth = 3;
                this.ctx.strokeStyle = gradient;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';

                // Calculate control points for curved line
                const dx = center2.x - center1.x;
                const dy = center2.y - center1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const curvature = Math.min(distance * 0.3, 100);

                const midX = (center1.x + center2.x) / 2;
                const midY = (center1.y + center2.y) / 2;

                // Add perpendicular offset for curve
                const perpX = -dy / distance * curvature;
                const perpY = dx / distance * curvature;

                const controlX = midX + perpX;
                const controlY = midY + perpY;

                // Draw curved line
                this.ctx.moveTo(center1.x, center1.y);
                this.ctx.quadraticCurveTo(controlX, controlY, center2.x, center2.y);
                this.ctx.stroke();

                // Draw subtle glow effect
                this.ctx.beginPath();
                this.ctx.lineWidth = 6;
                this.ctx.strokeStyle = 'rgba(102, 126, 234, 0.1)';
                this.ctx.moveTo(center1.x, center1.y);
                this.ctx.quadraticCurveTo(controlX, controlY, center2.x, center2.y);
                this.ctx.stroke();

                // Draw connection points
                this.drawConnectionPoint(center1);
                this.drawConnectionPoint(center2);
            });
        });
    }

    drawConnectionPoint(center) {
        // Draw outer glow
        const glowGradient = this.ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 8);
        glowGradient.addColorStop(0, 'rgba(102, 126, 234, 0.4)');
        glowGradient.addColorStop(1, 'rgba(102, 126, 234, 0)');
        
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = glowGradient;
        this.ctx.fill();

        // Draw inner point
        const pointGradient = this.ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 4);
        pointGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        pointGradient.addColorStop(1, 'rgba(102, 126, 234, 0.8)');

        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = pointGradient;
        this.ctx.fill();
    }

    editNode(node) {
        this.currentEditingNode = node;
        const modal = document.getElementById('editModal');
        const editText = document.getElementById('editText');
        
        editText.value = node.text;
        modal.classList.remove('hidden');
        editText.focus();

        // Set current color in color picker
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.color === node.color) {
                option.classList.add('selected');
            }
        });
    }

    saveEdit() {
        if (!this.currentEditingNode) return;

        const editText = document.getElementById('editText');
        const selectedColor = document.querySelector('.color-option.selected');
        
        this.currentEditingNode.updateText(editText.value || 'New Node');
        
        if (selectedColor) {
            this.currentEditingNode.changeColor(selectedColor.dataset.color);
        }

        this.currentEditingNode.adjustSize();
        this.redrawConnections();
        this.cancelEdit();
    }

    cancelEdit() {
        this.currentEditingNode = null;
        const modal = document.getElementById('editModal');
        modal.classList.add('hidden');
    }

    showContextMenu(e, node) {
        const contextMenu = document.getElementById('contextMenu');
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
        contextMenu.classList.remove('hidden');

        const handleContextAction = (e) => {
            const action = e.target.dataset.action;
            if (action === 'edit') {
                this.editNode(node);
            } else if (action === 'duplicate') {
                const duplicate = node.duplicate();
                this.nodes.set(duplicate.id, duplicate);
                const mindMapArea = document.getElementById('mindMapArea');
                mindMapArea.appendChild(duplicate.render());
            } else if (action === 'delete') {
                this.deleteNode(node);
            } else if (action === 'changeColor') {
                this.editNode(node);
            }
            
            contextMenu.classList.add('hidden');
            contextMenu.removeEventListener('click', handleContextAction);
        };

        contextMenu.addEventListener('click', handleContextAction);

        // Hide menu on outside click
        setTimeout(() => {
            const hideMenu = (e) => {
                if (!contextMenu.contains(e.target)) {
                    contextMenu.classList.add('hidden');
                    document.removeEventListener('click', hideMenu);
                }
            };
            document.addEventListener('click', hideMenu);
        }, 100);
    }

    fitView() {
        if (this.nodes.size === 0 && this.stickyNotes.size === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        // Include mind map nodes
        this.nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        });

        // Include sticky notes
        this.stickyNotes.forEach(note => {
            minX = Math.min(minX, note.x);
            minY = Math.min(minY, note.y);
            maxX = Math.max(maxX, note.x + note.width);
            maxY = Math.max(maxY, note.y + note.height);
        });

        const padding = 50;
        const containerRect = document.getElementById('canvasContainer').getBoundingClientRect();
        
        const contentWidth = maxX - minX + padding * 2;
        const contentHeight = maxY - minY + padding * 2;
        
        // Calculate offset to center content
        const offsetX = (containerRect.width - contentWidth) / 2 - minX + padding;
        const offsetY = (containerRect.height - contentHeight) / 2 - minY + padding;

        // Move all nodes
        this.nodes.forEach(node => {
            node.x += offsetX;
            node.y += offsetY;
            node.updatePosition();
        });

        // Move all sticky notes
        this.stickyNotes.forEach(note => {
            note.x += offsetX;
            note.y += offsetY;
            if (note.element) {
                note.element.style.left = note.x + 'px';
                note.element.style.top = note.y + 'px';
            }
        });

        this.redrawConnections();
    }

    clearAll() {
        if (this.nodes.size === 0 && this.stickyNotes.size === 0) {
            return;
        }
        
        if (confirm('Are you sure you want to clear all nodes, sticky notes, and connections?')) {
            this.nodes.clear();
            this.stickyNotes.clear();
            document.getElementById('mindMapArea').innerHTML = `
                <div class="empty-state" id="emptyState">
                    <i class="fas fa-brain"></i>
                    <h3>Start mapping your ideas</h3>
                    <p>Click "Add Node" or "Add Sticky Note" to begin</p>
                </div>
            `;
            this.redrawConnections();
        }
    }

    saveToStorage() {
        const data = {
            nodes: Array.from(this.nodes.values()).map(node => node.toJSON()),
            stickyNotes: Array.from(this.stickyNotes.values()).map(note => note.toJSON()),
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('mindMapData', JSON.stringify(data));
        
        // Show subtle feedback
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
        saveBtn.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.4), rgba(5, 150, 105, 0.4))';
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.style.background = '';
        }, 1000);
    }

    autoSave() {
        // Silent auto-save for real-time updates
        const data = {
            nodes: Array.from(this.nodes.values()).map(node => node.toJSON()),
            stickyNotes: Array.from(this.stickyNotes.values()).map(note => note.toJSON()),
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('mindMapData', JSON.stringify(data));
    }

    loadFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.loadFromData(data);
                } catch (error) {
                    alert('Error loading file: ' + error.message);
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    loadFromData(data) {
        // Clear nodes and sticky notes without confirmation dialog
        this.nodes.clear();
        this.stickyNotes.clear();
        const mindMapArea = document.getElementById('mindMapArea');
        mindMapArea.innerHTML = `
            <div class="empty-state" id="emptyState">
                <i class="fas fa-brain"></i>
                <h3>Start mapping your ideas</h3>
                <p>Click "Add Node" or "Add Sticky Note" to begin</p>
            </div>
        `;
        this.redrawConnections();
        
        const hasNodes = data.nodes && data.nodes.length > 0;
        const hasStickies = data.stickyNotes && data.stickyNotes.length > 0;
        
        if (!hasNodes && !hasStickies) return;

        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        // Load nodes
        if (hasNodes) {
            // First pass: create all nodes
            data.nodes.forEach(nodeData => {
                const node = MindMapNode.fromJSON(nodeData);
                this.nodes.set(node.id, node);
                mindMapArea.appendChild(node.render());
            });

            // Second pass: establish connections (after all nodes exist)
            data.nodes.forEach(nodeData => {
                const node = this.nodes.get(nodeData.id);
                if (node && nodeData.connections) {
                    nodeData.connections.forEach(connectionId => {
                        if (this.nodes.has(connectionId)) {
                            node.addConnection(connectionId);
                        }
                    });
                }
            });
        }

        // Load sticky notes
        if (hasStickies) {
            data.stickyNotes.forEach(noteData => {
                const note = StickyNote.fromJSON(noteData);
                this.stickyNotes.set(note.id, note);
                mindMapArea.appendChild(note.render());
            });
        }

        this.redrawConnections();
    }

    showExportMenu(e) {
        // Remove existing export menu if any
        const existingMenu = document.getElementById('exportMenu');
        if (existingMenu) {
            document.body.removeChild(existingMenu);
        }

        const exportMenu = document.createElement('div');
        exportMenu.id = 'exportMenu';
        exportMenu.className = 'context-menu';
        exportMenu.innerHTML = `
            <div class="context-item" data-action="exportJSON">
                <i class="fas fa-file-code"></i> Export JSON
            </div>
            <div class="context-item" data-action="exportPNG">
                <i class="fas fa-image"></i> Export PNG
            </div>
            <div class="context-item" data-action="exportSVG">
                <i class="fas fa-vector-square"></i> Export SVG
            </div>
            <div class="context-separator"></div>
            <div class="context-item" data-action="exportMarkdown">
                <i class="fab fa-markdown"></i> Export Markdown
            </div>
        `;

        exportMenu.style.left = e.pageX + 'px';
        exportMenu.style.top = e.pageY + 'px';
        exportMenu.style.display = 'block';

        document.body.appendChild(exportMenu);

        exportMenu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-item')?.dataset.action;
            if (action === 'exportJSON') {
                this.exportToJSON();
            } else if (action === 'exportPNG') {
                this.exportToPNG();
            } else if (action === 'exportSVG') {
                this.exportToSVG();
            } else if (action === 'exportMarkdown') {
                this.exportToMarkdown();
            }
            document.body.removeChild(exportMenu);
        });

        // Remove menu on outside click
        setTimeout(() => {
            const hideMenu = (e) => {
                if (!exportMenu.contains(e.target)) {
                    if (exportMenu.parentNode) {
                        document.body.removeChild(exportMenu);
                    }
                    document.removeEventListener('click', hideMenu);
                }
            };
            document.addEventListener('click', hideMenu);
        }, 100);
    }

    exportToJSON() {
        const data = {
            nodes: Array.from(this.nodes.values()).map(node => node.toJSON()),
            stickyNotes: Array.from(this.stickyNotes.values()).map(note => note.toJSON()),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        
        URL.revokeObjectURL(url);
    }

    exportToPNG() {
        const container = document.getElementById('canvasContainer');
        html2canvas(container, {
            backgroundColor: 'transparent',
            scale: 2
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'mindmap_' + new Date().toISOString().slice(0, 10) + '.png';
            link.href = canvas.toDataURL();
            link.click();
        });
    }

    exportToSVG() {
        const container = document.getElementById('canvasContainer');
        const rect = container.getBoundingClientRect();
        
        let svgContent = `<svg width="${rect.width}" height="${rect.height}" xmlns="http://www.w3.org/2000/svg">`;
        
        // Add connections
        this.nodes.forEach(node => {
            node.connections.forEach(connectionId => {
                const connectedNode = this.nodes.get(connectionId);
                if (connectedNode && node.id < connectionId) { // Avoid duplicates
                    const center1 = node.getCenter();
                    const center2 = connectedNode.getCenter();
                    svgContent += `<line x1="${center1.x}" y1="${center1.y}" x2="${center2.x}" y2="${center2.y}" stroke="rgba(102, 126, 234, 0.8)" stroke-width="3"/>`;
                }
            });
        });
        
        // Add nodes
        this.nodes.forEach(node => {
            svgContent += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" fill="${node.color}" rx="12" stroke="${node.darkenColor(node.color)}" stroke-width="2"/>`;
            svgContent += `<text x="${node.x + node.width/2}" y="${node.y + node.height/2}" text-anchor="middle" dominant-baseline="central" fill="white" font-family="Inter" font-size="13" font-weight="500">${node.text}</text>`;
        });
        
        svgContent += '</svg>';
        
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap_' + new Date().toISOString().slice(0, 10) + '.svg';
        a.click();
        
        URL.revokeObjectURL(url);
    }

    exportToMarkdown() {
        let markdown = '# Mind Map\n\n';
        markdown += `Generated on ${new Date().toLocaleDateString()}\n\n`;
        
        // Group nodes by connections
        const visited = new Set();
        const groups = [];
        
        this.nodes.forEach(node => {
            if (!visited.has(node.id)) {
                const group = this.getConnectedGroup(node, visited);
                groups.push(group);
            }
        });
        
        groups.forEach((group, index) => {
            markdown += `## Group ${index + 1}\n\n`;
            group.forEach(node => {
                markdown += `- **${node.text}**\n`;
                node.connections.forEach(connectionId => {
                    const connectedNode = this.nodes.get(connectionId);
                    if (connectedNode && group.includes(connectedNode)) {
                        markdown += `  - Connected to: ${connectedNode.text}\n`;
                    }
                });
            });
            markdown += '\n';
        });
        
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap_' + new Date().toISOString().slice(0, 10) + '.md';
        a.click();
        
        URL.revokeObjectURL(url);
    }

    getConnectedGroup(startNode, visited) {
        const group = [];
        const stack = [startNode];
        
        while (stack.length > 0) {
            const node = stack.pop();
            if (visited.has(node.id)) continue;
            
            visited.add(node.id);
            group.push(node);
            
            node.connections.forEach(connectionId => {
                const connectedNode = this.nodes.get(connectionId);
                if (connectedNode && !visited.has(connectedNode.id)) {
                    stack.push(connectedNode);
                }
            });
        }
        
        return group;
    }
} 