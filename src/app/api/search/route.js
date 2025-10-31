
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataDir = path.join(process.cwd(), 'src', 'data');
const filesToSearch = ['pedidos.json', 'stock.json', 'materiales.json', 'fabricantes.json', 'plantillas.json'];

async function searchInFile(filename, query) {
    const filePath = path.join(dataDir, filename);
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        const queryLower = query.toLowerCase();

        if (!Array.isArray(data)) return [];

        return data.filter(item => {
            return Object.values(item).some(value => 
                String(value).toLowerCase().includes(queryLower)
            );
        });
    } catch (error) {
        console.error(`Error searching in file ${filename}:`, error);
        return []; // Return empty array if file is not found or there's a parsing error
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const searchPromises = filesToSearch.map(filename => 
        searchInFile(filename, q).then(results => ({ 
            category: filename.replace('.json', ''), 
            results 
        }))
    );

    const searchResults = await Promise.all(searchPromises);
    
    const finalResults = searchResults.reduce((acc, result) => {
        if (result.results.length > 0) {
            acc[result.category] = result.results;
        }
        return acc;
    }, {});

    return NextResponse.json(finalResults);
}
