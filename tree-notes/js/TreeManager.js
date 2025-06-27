class TreeManager {
    constructor() {
        this.rootNodes = [];
        this.selectedNode = null;
        this.treeContainer = document.getElementById('treeRoot');
        this.contextMenu = document.getElementById('contextMenu');
        this.editModal = document.getElementById('editModal');
        this.editText = document.getElementById('editText');
        this.currentEditingNode = null;
        
        this.initializeEventListeners();
        this.loadFromStorage();
    }

    initializeEventListeners() {
        // Toolbar buttons
        document.getElementById('addRootBtn').addEventListener('click', () => {
            this.addRootNode();
        });

        document.getElementById('expandAllBtn').addEventListener('click', () => {
            this.expandAll();
        });

        document.getElementById('collapseAllBtn').addEventListener('click', () => {
            this.collapseAll();
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

        // Context menu
        this.contextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action && this.selectedNode) {
                this.handleContextAction(action);
            }
            this.hideContextMenu();
        });

        // Modal
        document.getElementById('saveEditBtn').addEventListener('click', () => {
            this.saveEdit();
        });

        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            this.cancelEdit();
        });

        // Close modal on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!this.editModal.classList.contains('hidden')) {
                    this.cancelEdit();
                }
                this.hideContextMenu();
            }
        });

        // Close context menu on click outside
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Close modal on click outside
        this.editModal.addEventListener('click', (e) => {
            if (e.target === this.editModal) {
                this.cancelEdit();
            }
        });

        // Auto-save every 30 seconds
        setInterval(() => {
            this.autoSave();
        }, 30000);
    }

    addRootNode(text = 'New Node') {
        const rootNode = new TreeNode(text);
        this.rootNodes.push(rootNode);
        this.render();
        rootNode.select();
        
        // Start editing immediately for new nodes
        setTimeout(() => {
            this.editNode(rootNode);
        }, 100);
        
        return rootNode;
    }

    render() {
        // Clear container
        this.treeContainer.innerHTML = '';

        if (this.rootNodes.length === 0) {
            this.treeContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tree"></i>
                    <h3>Start building your tree</h3>
                    <p>Click "Add Root Node" to begin creating your outline</p>
                </div>
            `;
            return;
        }

        // Render all root nodes
        this.rootNodes.forEach(rootNode => {
            this.treeContainer.appendChild(rootNode.render());
        });
    }

    expandAll() {
        this.getAllNodes().forEach(node => {
            node.expanded = true;
            node.updateDisplay();
        });
    }

    collapseAll() {
        this.getAllNodes().forEach(node => {
            node.expanded = false;
            node.updateDisplay();
        });
    }

    getAllNodes() {
        const allNodes = [];
        
        const collectNodes = (nodes) => {
            nodes.forEach(node => {
                allNodes.push(node);
                collectNodes(node.children);
            });
        };
        
        collectNodes(this.rootNodes);
        return allNodes;
    }

    findNodeById(id) {
        const allNodes = this.getAllNodes();
        return allNodes.find(node => node.id === id);
    }

    editNode(node) {
        this.currentEditingNode = node;
        this.editText.value = node.text;
        this.editModal.classList.remove('hidden');
        this.editText.focus();
        this.editText.select();
        
        // Mark node as being edited
        if (node.element) {
            const nodeContent = node.element.querySelector('.node-content');
            nodeContent.classList.add('editing');
        }
    }

    saveEdit() {
        if (this.currentEditingNode) {
            const newText = this.editText.value.trim();
            if (newText) {
                this.currentEditingNode.text = newText;
                this.render();
                this.currentEditingNode.select();
            }
        }
        this.closeEditModal();
    }

    cancelEdit() {
        this.closeEditModal();
    }

    closeEditModal() {
        this.editModal.classList.add('hidden');
        if (this.currentEditingNode && this.currentEditingNode.element) {
            const nodeContent = this.currentEditingNode.element.querySelector('.node-content');
            nodeContent.classList.remove('editing');
        }
        this.currentEditingNode = null;
    }

    showContextMenu(e, node) {
        this.selectedNode = node;
        node.select();
        
        // Position menu next to the node element instead of mouse position
        const nodeRect = node.element.querySelector('.node-content').getBoundingClientRect();
        const menuWidth = 150; // Approximate menu width
        const menuHeight = 200; // Approximate menu height
        
        let left = nodeRect.right + 10; // 10px to the right of the node
        let top = nodeRect.top;
        
        // Adjust if menu would go off screen horizontally
        if (left + menuWidth > window.innerWidth) {
            left = nodeRect.left - menuWidth - 10; // Position to the left instead
        }
        
        // Adjust if menu would go off screen vertically
        if (top + menuHeight > window.innerHeight) {
            top = window.innerHeight - menuHeight - 10;
        }
        
        // Ensure menu doesn't go above viewport
        if (top < 10) {
            top = 10;
        }
        
        this.contextMenu.style.left = left + 'px';
        this.contextMenu.style.top = top + 'px';
        this.contextMenu.classList.remove('hidden');
    }

    hideContextMenu() {
        this.contextMenu.classList.add('hidden');
    }

    handleContextAction(action) {
        if (!this.selectedNode) return;

        switch (action) {
            case 'edit':
                this.editNode(this.selectedNode);
                break;
            case 'addChild':
                const child = this.selectedNode.addChild();
                this.selectedNode.expanded = true;
                this.render();
                setTimeout(() => {
                    this.editNode(child);
                }, 100);
                break;
            case 'addSibling':
                const sibling = this.selectedNode.addSibling();
                if (sibling) {
                    this.render();
                    setTimeout(() => {
                        this.editNode(sibling);
                    }, 100);
                }
                break;
            case 'delete':
                this.deleteNode(this.selectedNode);
                break;
            case 'duplicate':
                const duplicate = this.selectedNode.duplicate();
                if (duplicate) {
                    this.render();
                    duplicate.select();
                }
                break;
            case 'expandBranch':
                this.expandBranch(this.selectedNode);
                break;
            case 'collapseBranch':
                this.collapseBranch(this.selectedNode);
                break;
        }
    }

    deleteNode(node) {
        if (node.parent) {
            node.remove();
        } else {
            // Remove root node
            const index = this.rootNodes.indexOf(node);
            if (index > -1) {
                this.rootNodes.splice(index, 1);
            }
        }
        this.render();
        this.selectedNode = null;
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all nodes? This action cannot be undone.')) {
            this.rootNodes = [];
            this.selectedNode = null;
            this.render();
            this.saveToStorage();
        }
    }

    saveToStorage() {
        const data = {
            rootNodes: this.rootNodes.map(node => node.toJSON()),
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('treeNotes', JSON.stringify(data));
        
        // Show save feedback
        this.showNotification('Tree saved successfully!', 'success');
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('treeNotes');
            if (data) {
                const parsed = JSON.parse(data);
                this.rootNodes = [];
                
                if (parsed.rootNodes) {
                    parsed.rootNodes.forEach(nodeData => {
                        const node = TreeNode.fromJSON(nodeData);
                        this.rootNodes.push(node);
                    });
                }
                
                this.render();
            }
        } catch (error) {
            console.error('Error loading from storage:', error);
            this.showNotification('Error loading saved data', 'error');
        }
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
                    this.rootNodes = [];
                    
                    if (data.rootNodes) {
                        data.rootNodes.forEach(nodeData => {
                            const node = TreeNode.fromJSON(nodeData);
                            this.rootNodes.push(node);
                        });
                    }
                    
                    this.render();
                    this.showNotification('Tree loaded successfully!', 'success');
                } catch (error) {
                    console.error('Error loading file:', error);
                    this.showNotification('Error loading file. Please check the format.', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    autoSave() {
        if (this.rootNodes.length > 0) {
            this.saveToStorage();
        }
    }

    expandBranch(node) {
        // Recursively expand this node and all its descendants
        const expandRecursively = (n) => {
            n.expanded = true;
            n.children.forEach(child => expandRecursively(child));
        };
        
        expandRecursively(node);
        this.render();
        this.showNotification('Branch expanded!', 'info');
    }

    collapseBranch(node) {
        // Recursively collapse this node and all its descendants
        const collapseRecursively = (n) => {
            n.expanded = false;
            n.children.forEach(child => collapseRecursively(child));
        };
        
        collapseRecursively(node);
        this.render();
        this.showNotification('Branch collapsed!', 'info');
    }

    exportToFile() {
        const data = {
            rootNodes: this.rootNodes.map(node => node.toJSON()),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `tree-notes-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Tree exported successfully!', 'success');
    }

    exportToMarkdown() {
        const markdown = this.generateMarkdown();
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `tree-notes-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Markdown exported successfully!', 'success');
    }

    generateMarkdown() {
        let markdown = '# Tree Notes\n\n';
        
        const nodeToMarkdown = (node, level = 0) => {
            const indent = '  '.repeat(level);
            markdown += `${indent}- ${node.text}\n`;
            node.children.forEach(child => nodeToMarkdown(child, level + 1));
        };
        
        this.rootNodes.forEach((node, index) => {
            if (index > 0) markdown += '\n';
            nodeToMarkdown(node);
        });
        
        return markdown;
    }

    async exportToPNG() {
        try {
            this.showNotification('Generating PNG image...', 'info');
            
            // Create a clean export container
            const exportContainer = this.prepareExportContainer();
            
            // Use html2canvas to capture the tree
            const canvas = await html2canvas(exportContainer, {
                backgroundColor: '#ffffff',
                scale: 2, // Higher resolution
                useCORS: true,
                allowTaint: true,
                width: exportContainer.scrollWidth,
                height: exportContainer.scrollHeight
            });
            
            // Convert to blob and download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tree-notes-${new Date().toISOString().split('T')[0]}.png`;
                a.click();
                URL.revokeObjectURL(url);
                this.showNotification('PNG exported successfully!', 'success');
            }, 'image/png');
            
            // Clean up
            document.body.removeChild(exportContainer);
            
        } catch (error) {
            console.error('Error exporting PNG:', error);
            this.showNotification('Error exporting PNG image', 'error');
        }
    }

    exportToSVG() {
        try {
            this.showNotification('Generating SVG image...', 'info');
            
            const svg = this.generateSVG();
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `tree-notes-${new Date().toISOString().split('T')[0]}.svg`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showNotification('SVG exported successfully!', 'success');
            
        } catch (error) {
            console.error('Error exporting SVG:', error);
            this.showNotification('Error exporting SVG image', 'error');
        }
    }

    prepareExportContainer() {
        // Create a copy of the tree container for export
        const exportContainer = document.createElement('div');
        exportContainer.style.cssText = `
            position: absolute;
            left: -9999px;
            top: 0;
            background: white;
            padding: 40px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            color: #333;
            min-width: 800px;
        `;
        
        // Add title
        const title = document.createElement('h1');
        title.textContent = 'Tree Notes';
        title.style.cssText = `
            color: #374151;
            font-size: 2rem;
            margin-bottom: 30px;
            text-align: center;
        `;
        exportContainer.appendChild(title);
        
        // Clone the tree content
        const treeClone = this.treeContainer.cloneNode(true);
        
        // Remove interactive elements and clean up styles for export
        this.cleanForExport(treeClone);
        
        exportContainer.appendChild(treeClone);
        document.body.appendChild(exportContainer);
        
        return exportContainer;
    }

    cleanForExport(element) {
        // Remove expand/collapse buttons
        element.querySelectorAll('.expand-btn').forEach(btn => {
            btn.style.display = 'none';
        });
        
        // Remove hover effects and interactive states
        element.querySelectorAll('.node-content').forEach(content => {
            content.style.cursor = 'default';
            content.classList.remove('selected', 'editing', 'dragging', 'drag-over');
            content.removeAttribute('tabindex');
            content.removeAttribute('draggable');
        });
        
        // Show all collapsed content
        element.querySelectorAll('.node-children.collapsed').forEach(children => {
            children.classList.remove('collapsed');
            children.classList.add('expanded');
        });
        
        // Remove empty state if present
        const emptyState = element.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
    }

    generateSVG() {
        const nodes = this.getAllNodes();
        if (nodes.length === 0) {
            return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="200" y="100" text-anchor="middle" fill="#6b7280">No nodes to export</text></svg>';
        }
        
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800" style="background: white;">
            <defs>
                <style>
                    .node-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; fill: #374151; }
                    .node-rect { fill: #f8fafc; stroke: #e2e8f0; stroke-width: 2; rx: 8; }
                    .tree-line { stroke: #d1d5db; stroke-width: 1; }
                    .title-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: bold; fill: #374151; }
                </style>
            </defs>`;
        
        // Add title
        svg += `<text x="500" y="40" text-anchor="middle" class="title-text">Tree Notes</text>`;
        
        let yOffset = 80;
        const nodeHeight = 40;
        const nodeSpacing = 50;
        const indentWidth = 40;
        
        const renderNode = (node, level = 0, y = yOffset) => {
            const x = 50 + (level * indentWidth);
            const textLength = Math.max(200, node.text.length * 8 + 32);
            
            // Draw node rectangle
            svg += `<rect x="${x}" y="${y}" width="${textLength}" height="${nodeHeight}" class="node-rect"/>`;
            
            // Draw node text
            const textY = y + (nodeHeight / 2) + 5;
            svg += `<text x="${x + 16}" y="${textY}" class="node-text">${this.escapeXML(node.text)}</text>`;
            
            let currentY = y + nodeHeight + nodeSpacing;
            
            // Draw lines to children
            if (node.children.length > 0) {
                const childStartY = currentY;
                const childEndY = currentY + (node.children.length - 1) * (nodeHeight + nodeSpacing);
                
                // Vertical line from parent
                svg += `<line x1="${x + textLength}" y1="${y + nodeHeight/2}" x2="${x + textLength + 20}" y2="${y + nodeHeight/2}" class="tree-line"/>`;
                
                // Vertical line for children
                if (node.children.length > 1) {
                    svg += `<line x1="${x + textLength + 20}" y1="${childStartY + nodeHeight/2}" x2="${x + textLength + 20}" y2="${childEndY + nodeHeight/2}" class="tree-line"/>`;
                }
                
                // Render children
                node.children.forEach(child => {
                    // Horizontal line to child
                    svg += `<line x1="${x + textLength + 20}" y1="${currentY + nodeHeight/2}" x2="${x + textLength + 40}" y2="${currentY + nodeHeight/2}" class="tree-line"/>`;
                    
                    currentY = renderNode(child, level + 1, currentY);
                });
            }
            
            return currentY;
        };
        
        // Render all root nodes
        this.rootNodes.forEach(rootNode => {
            yOffset = renderNode(rootNode, 0, yOffset);
            yOffset += 30; // Extra spacing between root nodes
        });
        
        // Update SVG height based on content
        const finalHeight = Math.max(400, yOffset + 50);
        svg = svg.replace('viewBox="0 0 1000 800"', `viewBox="0 0 1000 ${finalHeight}"`);
        
        svg += '</svg>';
        return svg;
    }

    escapeXML(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '2000',
            opacity: '0',
            transform: 'translateY(-20px)',
            transition: 'all 0.3s ease'
        });
        
        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Export methods for external use
    exportData() {
        return {
            rootNodes: this.rootNodes.map(node => node.toJSON()),
            timestamp: new Date().toISOString()
        };
    }

    importData(data) {
        try {
            this.rootNodes = [];
            if (data.rootNodes) {
                data.rootNodes.forEach(nodeData => {
                    const node = TreeNode.fromJSON(nodeData);
                    this.rootNodes.push(node);
                });
            }
            this.render();
            this.saveToStorage();
            this.showNotification('Data imported successfully!', 'success');
        } catch (error) {
            console.error('Error importing data:', error);
            this.showNotification('Error importing data', 'error');
        }
    }
} 