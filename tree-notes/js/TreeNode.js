class TreeNode {
    constructor(text = 'New Node', parent = null) {
        this.id = this.generateId();
        this.text = text;
        this.parent = parent;
        this.children = [];
        this.expanded = true;
        this.element = null;
    }

    generateId() {
        return 'node_' + Math.random().toString(36).substr(2, 9);
    }

    // Add a child node
    addChild(text = 'New Node') {
        const childNode = new TreeNode(text, this);
        this.children.push(childNode);
        return childNode;
    }

    // Remove this node from its parent
    remove() {
        if (this.parent) {
            const index = this.parent.children.indexOf(this);
            if (index > -1) {
                this.parent.children.splice(index, 1);
            }
        }
    }

    // Get siblings
    getSiblings() {
        if (!this.parent) return [];
        return this.parent.children.filter(child => child !== this);
    }

    // Add sibling after this node
    addSibling(text = 'New Node') {
        if (!this.parent) return null;
        
        const siblingNode = new TreeNode(text, this.parent);
        const index = this.parent.children.indexOf(this);
        this.parent.children.splice(index + 1, 0, siblingNode);
        return siblingNode;
    }

    // Duplicate this node (without children)
    duplicate() {
        if (!this.parent) return null;
        
        const duplicateNode = new TreeNode(this.text + ' (copy)', this.parent);
        const index = this.parent.children.indexOf(this);
        this.parent.children.splice(index + 1, 0, duplicateNode);
        return duplicateNode;
    }

    // Toggle expanded state
    toggleExpanded() {
        this.expanded = !this.expanded;
        this.updateDisplay();
    }

    // Update the visual display of expand/collapse
    updateDisplay() {
        if (!this.element) return;

        const expandBtn = this.element.querySelector('.expand-btn');
        const childrenContainer = this.element.querySelector('.node-children');

        if (this.children.length === 0) {
            if (expandBtn) expandBtn.style.display = 'none';
            return;
        }

        if (expandBtn) {
            expandBtn.style.display = 'flex';
            expandBtn.className = `expand-btn ${this.expanded ? 'expanded' : 'collapsed'}`;
        }

        if (childrenContainer) {
            childrenContainer.className = `node-children ${this.expanded ? 'expanded' : 'collapsed'}`;
        }
    }

    // Render the node as HTML
    render() {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'tree-node';
        nodeDiv.setAttribute('data-node-id', this.id);

        const hasChildren = this.children.length > 0;
        
        nodeDiv.innerHTML = `
            <div class="node-content" tabindex="0">
                ${hasChildren ? `<div class="expand-btn ${this.expanded ? 'expanded' : 'collapsed'}"></div>` : ''}
                <div class="node-text">${this.escapeHtml(this.text)}</div>
            </div>
            <div class="node-children ${this.expanded ? 'expanded' : 'collapsed'}"></div>
        `;

        // Add event listeners
        this.addEventListeners(nodeDiv);

        // Render children
        const childrenContainer = nodeDiv.querySelector('.node-children');
        this.children.forEach(child => {
            childrenContainer.appendChild(child.render());
        });

        this.element = nodeDiv;
        this.updateDisplay();

        return nodeDiv;
    }

    addEventListeners(nodeDiv) {
        const nodeContent = nodeDiv.querySelector('.node-content');
        const expandBtn = nodeDiv.querySelector('.expand-btn');

        // Double-click to edit
        nodeContent.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.startEdit();
        });

        // Right-click for context menu
        nodeContent.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e);
        });

        // Click to select
        nodeContent.addEventListener('click', (e) => {
            e.stopPropagation();
            this.select();
        });

        // Keyboard navigation
        nodeContent.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });

        // Expand/collapse button
        if (expandBtn) {
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleExpanded();
            });
        }

        // Drag and drop
        nodeContent.draggable = true;
        nodeContent.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', this.id);
            nodeContent.classList.add('dragging');
        });

        nodeContent.addEventListener('dragend', () => {
            nodeContent.classList.remove('dragging');
        });

        nodeContent.addEventListener('dragover', (e) => {
            e.preventDefault();
            nodeContent.classList.add('drag-over');
        });

        nodeContent.addEventListener('dragleave', () => {
            nodeContent.classList.remove('drag-over');
        });

        nodeContent.addEventListener('drop', (e) => {
            e.preventDefault();
            nodeContent.classList.remove('drag-over');
            const draggedId = e.dataTransfer.getData('text/plain');
            this.handleDrop(draggedId);
        });
    }

    startEdit() {
        window.treeManager.editNode(this);
    }

    showContextMenu(e) {
        window.treeManager.showContextMenu(e, this);
    }

    select() {
        // Remove previous selection
        document.querySelectorAll('.node-content.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to this node
        if (this.element) {
            const nodeContent = this.element.querySelector('.node-content');
            nodeContent.classList.add('selected');
        }
        
        window.treeManager.selectedNode = this;
    }

    handleKeyPress(e) {
        switch(e.key) {
            case 'Enter':
                e.preventDefault();
                this.startEdit();
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                if (this.parent) { // Don't delete root nodes
                    this.remove();
                    window.treeManager.render();
                }
                break;
            case 'Tab':
                e.preventDefault();
                if (e.shiftKey) {
                    // Move to parent level (outdent)
                    this.moveToParentLevel();
                } else {
                    // Move to child level (indent)
                    this.moveToChildLevel();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectPrevious();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.selectNext();
                break;
        }
    }

    moveToParentLevel() {
        if (!this.parent || !this.parent.parent) return;
        
        const grandParent = this.parent.parent;
        const parentIndex = grandParent.children.indexOf(this.parent);
        
        // Remove from current parent
        this.remove();
        
        // Add to grandparent after the original parent
        this.parent = grandParent;
        grandParent.children.splice(parentIndex + 1, 0, this);
        
        window.treeManager.render();
        this.select();
    }

    moveToChildLevel() {
        if (!this.parent) return;
        
        const siblings = this.parent.children;
        const myIndex = siblings.indexOf(this);
        
        if (myIndex === 0) return; // Can't move to child of non-existent previous sibling
        
        const previousSibling = siblings[myIndex - 1];
        
        // Remove from current parent
        this.remove();
        
        // Add as child of previous sibling
        this.parent = previousSibling;
        previousSibling.children.push(this);
        previousSibling.expanded = true;
        
        window.treeManager.render();
        this.select();
    }

    selectPrevious() {
        const allNodes = window.treeManager.getAllNodes();
        const currentIndex = allNodes.indexOf(this);
        if (currentIndex > 0) {
            allNodes[currentIndex - 1].select();
            allNodes[currentIndex - 1].element.querySelector('.node-content').focus();
        }
    }

    selectNext() {
        const allNodes = window.treeManager.getAllNodes();
        const currentIndex = allNodes.indexOf(this);
        if (currentIndex < allNodes.length - 1) {
            allNodes[currentIndex + 1].select();
            allNodes[currentIndex + 1].element.querySelector('.node-content').focus();
        }
    }

    handleDrop(draggedId) {
        const draggedNode = window.treeManager.findNodeById(draggedId);
        if (!draggedNode || draggedNode === this) return;
        
        // Prevent dropping a parent onto its child
        if (this.isDescendantOf(draggedNode)) return;
        
        // Remove from old parent
        draggedNode.remove();
        
        // Add as child of this node
        draggedNode.parent = this;
        this.children.push(draggedNode);
        this.expanded = true;
        
        window.treeManager.render();
    }

    isDescendantOf(node) {
        let current = this.parent;
        while (current) {
            if (current === node) return true;
            current = current.parent;
        }
        return false;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Serialize to JSON
    toJSON() {
        return {
            id: this.id,
            text: this.text,
            expanded: this.expanded,
            children: this.children.map(child => child.toJSON())
        };
    }

    // Create from JSON
    static fromJSON(data, parent = null) {
        const node = new TreeNode(data.text, parent);
        node.id = data.id;
        node.expanded = data.expanded !== undefined ? data.expanded : true;
        
        if (data.children) {
            data.children.forEach(childData => {
                const child = TreeNode.fromJSON(childData, node);
                node.children.push(child);
            });
        }
        
        return node;
    }
} 