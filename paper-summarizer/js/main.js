document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const apiKeyInput = document.getElementById('api-key');
    const toggleApiKeyBtn = document.getElementById('toggle-api-key');
    const searchForm = document.getElementById('search-form');
    const papersList = document.getElementById('papers-list');
    const paperSummary = document.getElementById('paper-summary');
    const loadingPapers = document.getElementById('loading-papers');
    const loadingSummary = document.getElementById('loading-summary');
    const modelSelect = document.getElementById('model');
    
    // Check for saved API key in localStorage
    if (localStorage.getItem('groqApiKey')) {
        apiKeyInput.value = localStorage.getItem('groqApiKey');
    }
    
    // Toggle API key visibility
    toggleApiKeyBtn.addEventListener('click', function() {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleApiKeyBtn.innerHTML = '<i class="bi bi-eye-slash"></i> Hide';
        } else {
            apiKeyInput.type = 'password';
            toggleApiKeyBtn.innerHTML = '<i class="bi bi-eye"></i> Show';
        }
    });
    
    // Save API key to localStorage when changed
    apiKeyInput.addEventListener('change', function() {
        localStorage.setItem('groqApiKey', apiKeyInput.value);
    });
    
    // Handle form submission
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert('Please enter your GROQ API key');
            apiKeyInput.focus();
            return;
        }
        
        const source = document.getElementById('source').value;
        const query = document.getElementById('query').value.trim();
        const maxResults = document.getElementById('max-results').value;
        
        if (!query) {
            alert('Please enter a search query');
            document.getElementById('query').focus();
            return;
        }
        
        fetchPapers(source, query, maxResults);
    });
    
    // Fetch papers from external APIs
    async function fetchPapers(source, query, maxResults) {
        // Show loading spinner
        loadingPapers.classList.remove('d-none');
        
        // Clear previous results
        papersList.innerHTML = '';
        
        try {
            let papers = [];
            
            if (source === 'arxiv') {
                papers = await fetchFromArxiv(query, maxResults);
            } else if (source === 'pubmed') {
                papers = await fetchFromPubmed(query, maxResults);
            }
            
            // Hide loading spinner
            loadingPapers.classList.add('d-none');
            
            if (papers.length === 0) {
                papersList.innerHTML = `<div class="text-center text-muted">No papers found</div>`;
                return;
            }
            
            // Display papers
            papers.forEach(paper => {
                const paperItem = document.createElement('div');
                paperItem.className = 'list-group-item paper-item';
                paperItem.innerHTML = `
                    <div class="paper-title">${paper.title}</div>
                    <div class="paper-authors">${paper.authors}</div>
                    <div class="paper-date">${paper.date} | ${paper.source}</div>
                `;
                
                // Store paper data
                paperItem.dataset.paper = JSON.stringify(paper);
                
                // Add click event
                paperItem.addEventListener('click', function() {
                    // Remove active class from all items
                    document.querySelectorAll('.paper-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    
                    // Add active class to clicked item
                    this.classList.add('active');
                    
                    // Get paper data
                    const paper = JSON.parse(this.dataset.paper);
                    
                    // Display paper details and summarize
                    displayPaperAndSummarize(paper);
                });
                
                papersList.appendChild(paperItem);
            });
        } catch (error) {
            loadingPapers.classList.add('d-none');
            papersList.innerHTML = `<div class="alert alert-danger">Error fetching papers: ${error.message}</div>`;
        }
    }
    
    // Fetch papers from arXiv
    async function fetchFromArxiv(query, maxResults) {
        // arXiv API URL with CORS proxy
        // const arxivUrl = `https://cors-anywhere.herokuapp.com/http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}`;
        // Use one of these alternatives:
        const arxivUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`http://export.arxiv.org/api/query?search_query=all:${query}&start=0&max_results=${maxResults}`)}`;
        
        try {
            const response = await fetch(arxivUrl);
            const data = await response.text();
            
            // Parse XML response
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");
            
            const entries = xmlDoc.getElementsByTagName('entry');
            const papers = [];
            
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                
                // Extract data from XML
                const title = entry.getElementsByTagName('title')[0].textContent.trim();
                
                // Extract authors
                const authorNodes = entry.getElementsByTagName('author');
                const authors = [];
                for (let j = 0; j < authorNodes.length; j++) {
                    authors.push(authorNodes[j].getElementsByTagName('name')[0].textContent);
                }
                
                const summary = entry.getElementsByTagName('summary')[0].textContent.trim();
                const published = entry.getElementsByTagName('published')[0].textContent;
                const publishedDate = new Date(published).toLocaleDateString();
                const link = entry.getElementsByTagName('id')[0].textContent;
                
                papers.push({
                    title: title,
                    authors: authors.join(', '),
                    abstract: summary,
                    date: publishedDate,
                    url: link,
                    source: 'arXiv'
                });
            }
            
            return papers;
        } catch (error) {
            console.error('Error fetching from arXiv:', error);
            
            // Fallback to sample data if CORS issues occur
            alert('CORS issue with arXiv API. Using sample data instead. In a production environment, you would need a proper backend proxy.');
            return getSampleArxivPapers(query, maxResults);
        }
    }
    
    // Fetch papers from PubMed
    async function fetchFromPubmed(query, maxResults) {
        try {
            // PubMed API URLs
            const searchUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=${maxResults}&sort=relevance&retmode=json`)}`;
            
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();
            
            if (!searchData.esearchresult || !searchData.esearchresult.idlist || searchData.esearchresult.idlist.length === 0) {
                return [];
            }
            
            const ids = searchData.esearchresult.idlist;
            
            // Get summary data
            const summaryUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`)}`;
            const summaryResponse = await fetch(summaryUrl);
            const summaryData = await summaryResponse.json();
            
            // Get abstract data using efetch
            const fetchUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`)}`;
            const fetchResponse = await fetch(fetchUrl);
            const fetchData = await fetchResponse.text();
            
            // Parse XML to get abstracts
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(fetchData, "text/xml");
            const articles = xmlDoc.getElementsByTagName('PubmedArticle');
            
            // Create a map of ID to abstract
            const abstractMap = {};
            for (let i = 0; i < articles.length; i++) {
                const article = articles[i];
                const pmid = article.getElementsByTagName('PMID')[0]?.textContent;
                
                // Try to find abstract text
                const abstractTextNodes = article.getElementsByTagName('AbstractText');
                let abstractText = '';
                
                if (abstractTextNodes.length > 0) {
                    // Combine all abstract sections
                    for (let j = 0; j < abstractTextNodes.length; j++) {
                        const label = abstractTextNodes[j].getAttribute('Label');
                        const text = abstractTextNodes[j].textContent;
                        
                        if (label) {
                            abstractText += `${label}: ${text}\n\n`;
                        } else {
                            abstractText += `${text}\n\n`;
                        }
                    }
                }
                
                if (pmid && abstractText) {
                    abstractMap[pmid] = abstractText.trim();
                }
            }
            
            const papers = [];
            
            for (const id of ids) {
                if (summaryData.result && summaryData.result[id]) {
                    const article = summaryData.result[id];
                    
                    papers.push({
                        title: article.title,
                        authors: article.authors.map(author => author.name).join(', '),
                        abstract: abstractMap[id] || article.description || 'No abstract available',
                        date: article.pubdate,
                        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
                        source: 'PubMed'
                    });
                }
            }
            
            return papers;
        } catch (error) {
            console.error('Error fetching from PubMed:', error);
            
            // Fallback to sample data if CORS issues occur
            alert('CORS issue with PubMed API. Using sample data instead. In a production environment, you would need a proper backend proxy.');
            return getSamplePubmedPapers(query, maxResults);
        }
    }
    
    // Display paper details and generate summary
    function displayPaperAndSummarize(paper) {
        // Show loading spinner
        loadingSummary.classList.remove('d-none');
        
        // Display paper details while waiting for summary
        paperSummary.innerHTML = `
            <h3>${paper.title}</h3>
            <div class="paper-authors mb-3">${paper.authors}</div>
            <div class="paper-abstract mb-3">
                <strong>Abstract:</strong>
                <p>${paper.abstract}</p>
            </div>
            <div class="mb-3">
                <a href="${paper.url}" target="_blank" class="btn btn-sm btn-outline-primary">View Original Paper</a>
            </div>
            <hr>
            <h4>Summary</h4>
            <div class="summary-content">
                <div class="loading-text text-center">Generating summary with GROQ API...</div>
            </div>
        `;
        
        // Get API key and model
        const apiKey = apiKeyInput.value.trim();
        const model = modelSelect.value;
        
        // Generate summary using GROQ API
        generateSummary(paper, apiKey, model);
    }
    
    // Generate summary using GROQ API
    async function generateSummary(paper, apiKey, model) {
        const summaryContent = paperSummary.querySelector('.summary-content');
        
        try {
            // Prepare the prompt for GROQ
            const prompt = `
            Please provide a concise summary of the following scientific paper. 
            Include the main research question, key findings, and new research idea based on this paper.
            Format the summary with clear sections and bullet points where appropriate.
            
            Paper Title: ${paper.title}
            Authors: ${paper.authors}
            Abstract: ${paper.abstract}
            `;
            
            // Call GROQ API
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {role: "user", content: prompt}
                    ],
                    temperature: 0.3,
                    max_tokens: 1024
                })
            });
            
            // Hide loading spinner
            loadingSummary.classList.add('d-none');
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Error calling GROQ API');
            }
            
            const result = await response.json();
            const summary = result.choices[0].message.content;
            
            // Convert markdown to HTML and display the summary
            summaryContent.innerHTML = convertMarkdownToHtml(summary);
        } catch (error) {
            loadingSummary.classList.add('d-none');
            summaryContent.innerHTML = `<div class="alert alert-danger">Error generating summary: ${error.message}</div>`;
        }
    }
    
    // Function to convert markdown to HTML with improved spacing
    function convertMarkdownToHtml(markdown) {
        // First, handle bullet points and lists properly
        let html = markdown
            // Headers with margin-top for spacing
            .replace(/^### (.*$)/gim, '<h3 class="mt-4">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="mt-4">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="mt-4">$1</h1>')
            
            // Bold text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            
            // Italic text
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            
            // Handle bullet points with proper spacing and nesting
            // Convert "+ " bullet points to list items with proper indentation
            .replace(/^(\s*)\+\s+(.+)$/gm, function(match, indent, content) {
                // Calculate indentation level based on spaces
                const level = Math.floor(indent.length / 2);
                return `<li data-level="${level}" class="indent-${level}">${content}</li>`;
            })
            
            // Handle asterisk bullet points similarly
            .replace(/^(\s*)\*\s+(.+)$/gm, function(match, indent, content) {
                const level = Math.floor(indent.length / 2);
                return `<li data-level="${level}" class="indent-${level}">${content}</li>`;
            })
            
            // Process list items to create proper nested lists
            .replace(/(<li[^>]*>.*?<\/li>)/g, function(match) {
                return '<ul class="mt-2 mb-3">' + match + '</ul>';
            })
            
            // Fix duplicate ul tags
            .replace(/<\/ul>\s*<ul[^>]*>/g, '')
            
            // Numbered lists with indentation
            .replace(/^(\s*)\d+\.\s+(.+)$/gm, function(match, indent, content) {
                const level = Math.floor(indent.length / 2);
                return `<li data-level="${level}" class="indent-${level}">${content}</li>`;
            })
            
            // Paragraphs with spacing
            .replace(/^\s*\n\s*\n/gm, '</p>\n<p class="mt-3">')
            
            // Handle line breaks more intelligently
            .replace(/\n\n+/g, '</p><p class="mt-3">')
            .replace(/\n(?!<\/?(p|ul|ol|li|h[1-6]))/g, '<br>');
        
        // Wrap with paragraph tags if not already
        if (!html.startsWith('<h') && !html.startsWith('<p>') && !html.startsWith('<ul>')) {
            html = '<p>' + html + '</p>';
        }
        
        // Add section dividers for main sections
        html = html.replace(/<h2/g, '<hr class="mt-4 mb-3"><h2');
        
        // Clean up any excessive breaks
        html = html.replace(/<br><br>/g, '<br>');
        
        // Add spacing between list items
        html = html.replace(/<li/g, '<li class="mb-1"');
        
        // Add CSS for indentation levels
        const style = document.createElement('style');
        if (!document.querySelector('style[data-indent-styles]')) {
            style.setAttribute('data-indent-styles', 'true');
            style.textContent = `
                .indent-0 { margin-left: 0; }
                .indent-1 { margin-left: 1.5rem; }
                .indent-2 { margin-left: 3rem; }
                .indent-3 { margin-left: 4.5rem; }
                .indent-4 { margin-left: 6rem; }
            `;
            document.head.appendChild(style);
        }
        
        return html;
    }
    
    // Sample data for arXiv (fallback if API fails due to CORS)
    function getSampleArxivPapers(query, maxResults) {
        const samplePapers = [
            {
                title: "Attention Is All You Need",
                authors: "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin",
                abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.",
                date: "2017-06-12",
                url: "https://arxiv.org/abs/1706.03762",
                source: "arXiv"
            },
            {
                title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
                authors: "Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova",
                abstract: "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers. As a result, the pre-trained BERT model can be fine-tuned with just one additional output layer to create state-of-the-art models for a wide range of tasks, such as question answering and language inference, without substantial task-specific architecture modifications.",
                date: "2018-10-11",
                url: "https://arxiv.org/abs/1810.04805",
                source: "arXiv"
            },
            {
                title: "Deep Residual Learning for Image Recognition",
                authors: "Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun",
                abstract: "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions. We provide comprehensive empirical evidence showing that these residual networks are easier to optimize, and can gain accuracy from considerably increased depth. On the ImageNet dataset we evaluate residual nets with a depth of up to 152 layers—8× deeper than VGG nets but still having lower complexity.",
                date: "2015-12-10",
                url: "https://arxiv.org/abs/1512.03385",
                source: "arXiv"
            }
        ];
        
        // Filter by query if provided
        if (query) {
            const lowerQuery = query.toLowerCase();
            return samplePapers
                .filter(paper => 
                    paper.title.toLowerCase().includes(lowerQuery) || 
                    paper.abstract.toLowerCase().includes(lowerQuery) ||
                    paper.authors.toLowerCase().includes(lowerQuery)
                )
                .slice(0, maxResults);
        }
        
        return samplePapers.slice(0, maxResults);
    }
    
    // Sample data for PubMed (fallback if API fails due to CORS)
    function getSamplePubmedPapers(query, maxResults) {
        const samplePapers = [
            {
                title: "The COVID-19 vaccine development landscape",
                authors: "Tung Thanh Le, Zacharias Andreadakis, Arun Kumar, Raúl Gómez Román, Stig Tollefsen, Melanie Saville, Stephen Mayhew",
                abstract: "The genetic sequence of SARS-CoV-2, the coronavirus that causes COVID-19, was published on 11 January 2020, triggering intense global R&D activity to develop a vaccine against the disease. The scale of the humanitarian and economic impact of the COVID-19 pandemic is driving evaluation of next-generation vaccine technology platforms through novel paradigms to accelerate development, and the first COVID-19 vaccine candidate entered human clinical testing with unprecedented rapidity on 16 March 2020.",
                date: "2020-04-09",
                url: "https://pubmed.ncbi.nlm.nih.gov/32887942/",
                source: "PubMed"
            },
            {
                title: "CRISPR-Cas9 gene editing for sickle cell disease and β-thalassemia",
                authors: "Haydar Frangoul, David Altshuler, Danielle M. Cappellini, Yi-Shan Chen, Jennifer Domm, Brenda K. Eustace, Juergen Foell, Josu de la Fuente, Stephan Grupp, Rupert Handgretinger, Tony W. Ho, Antonis Kattamis, Andrew Kernytsky, Julie Lekstrom-Himes, Amanda M. Li, Franco Locatelli, Markus Y. Mapara, Mariane de Montalembert, Damiano Rondelli, Akshay Sharma, Sujit Sheth, Sandeep Soni, Martin H. Steinberg, Donna Wall, Angela Yen, Selim Corbacioglu",
                abstract: "Transfusion-dependent β-thalassemia (TDT) and sickle cell disease (SCD) are severe monogenic diseases with severe and potentially life-threatening manifestations. BCL11A is a transcription factor that represses γ-globin expression and fetal hemoglobin in erythroid cells. We performed electroporation of CD34+ hematopoietic stem and progenitor cells obtained from healthy donors, with CRISPR-Cas9 targeting the BCL11A erythroid-specific enhancer. Edited CD34+ cells were successfully engrafted in immunocompromised mice with increases in fetal hemoglobin.",
                date: "2021-01-21",
                url: "https://pubmed.ncbi.nlm.nih.gov/33471991/",
                source: "PubMed"
            },
            {
                title: "Alzheimer's disease: A review from the pathophysiology to diagnosis, new perspectives for pharmacological treatment",
                authors: "Giulia Sancesario, Sergio Bernardini",
                abstract: "Alzheimer's disease (AD) is the most common form of dementia, characterized by a progressive decline in cognitive function associated with the formation of senile plaques and neurofibrillary tangles. The pathophysiology of AD is complex and involves several mechanisms, including amyloid-β (Aβ) deposition, tau hyperphosphorylation, oxidative stress, neuroinflammation, and synaptic dysfunction. This review provides an overview of the pathophysiology of AD, current diagnostic approaches, and emerging therapeutic strategies.",
                date: "2019-05-15",
                url: "https://pubmed.ncbi.nlm.nih.gov/30978043/",
                source: "PubMed"
            }
        ];
        
        // Filter by query if provided
        if (query) {
            const lowerQuery = query.toLowerCase();
            return samplePapers
                .filter(paper => 
                    paper.title.toLowerCase().includes(lowerQuery) || 
                    paper.abstract.toLowerCase().includes(lowerQuery) ||
                    paper.authors.toLowerCase().includes(lowerQuery)
                )
                .slice(0, maxResults);
        }
        
        return samplePapers.slice(0, maxResults);
    }
});

// Add these variables at the top of your script or within your module
const DEFAULT_PROMPT = `You are a scientific research assistant. Summarize the following paper in a clear, concise, and informative way.

Title: {title}
Authors: {authors}
Abstract: {abstract}
Content: {content}

Provide a comprehensive summary that includes:
1. The main research question or objective
2. Most significant findings
3. A new research idea based on this paper

Format your response with appropriate headings and bullet points where relevant.`;

// When the page loads, set the default prompt
document.addEventListener('DOMContentLoaded', function() {
    // Set the default prompt as placeholder
    const customPromptElement = document.getElementById('custom-prompt');
    customPromptElement.placeholder = DEFAULT_PROMPT;
    
    // Load saved prompt from localStorage if it exists
    const savedPrompt = localStorage.getItem('customPrompt');
    if (savedPrompt) {
        customPromptElement.value = savedPrompt;
    }
    
    // Add event listener for the reset button
    document.getElementById('reset-prompt').addEventListener('click', function() {
        customPromptElement.value = DEFAULT_PROMPT;
        localStorage.setItem('customPrompt', DEFAULT_PROMPT);
    });
    
    // Save prompt to localStorage when it changes
    customPromptElement.addEventListener('input', function() {
        localStorage.setItem('customPrompt', this.value);
    });
});

// Modify your existing function that sends requests to the API
// This is just a template - you'll need to adapt it to your actual code
async function summarizePaper(paperData) {
    // Get the custom prompt or use default
    let promptTemplate = document.getElementById('custom-prompt').value.trim();
    if (!promptTemplate) {
        promptTemplate = DEFAULT_PROMPT;
    }
    
    // Replace placeholders with actual paper data
    const prompt = promptTemplate
        .replace('{title}', paperData.title || '')
        .replace('{authors}', paperData.authors || '')
        .replace('{abstract}', paperData.abstract || '')
        .replace('{content}', paperData.content || '');
    
    // Your existing code to send the request to the API
    // Make sure to use the custom prompt instead of a hardcoded one
    
    // Example:
    const apiKey = document.getElementById('api-key').value;
    const model = document.getElementById('model').value;
    
    // Your API call code here, using the prompt variable
    // ...
}

// Add this after your existing event listeners
document.getElementById('test-api-key').addEventListener('click', async function() {
    const apiKey = document.getElementById('api-key').value.trim();
    const resultDiv = document.getElementById('api-test-result');
    
    if (!apiKey) {
        resultDiv.innerHTML = '<div class="alert alert-warning">Please enter an API key first</div>';
        return;
    }
    
    resultDiv.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm" role="status"></div> Testing API key...</div>';
    
    try {
        // Simple test request to GROQ API
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            resultDiv.innerHTML = '<div class="alert alert-success">API key is valid! Available models: ' + 
                data.data.map(model => model.id).join(', ') + '</div>';
        } else {
            const error = await response.json();
            resultDiv.innerHTML = `<div class="alert alert-danger">API key error: ${error.error?.message || 'Unknown error'}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="alert alert-danger">Error testing API key: ${error.message}</div>`;
    }
});