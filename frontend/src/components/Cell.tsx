import React from 'react';
import './Cell.css';

export interface CellData {
    IsRevealed: boolean;
    IsMine: boolean;
    AdjacentMines: number;
    FlagState: number; // 0 = Empty, 1 = Placed, 2 = Validated
    FlagOwner?: string;
}

interface CellProps {
    data: CellData;
    onClick: () => void;
    onRightClick: (e: React.MouseEvent) => void;
}

const Cell: React.FC<CellProps> = React.memo(({ data, onClick, onRightClick }) => {
    const { IsRevealed, IsMine, AdjacentMines, FlagState } = data;

    let content: string | number = '';
    let className = 'cell';

    if (IsRevealed) {
        className += ' revealed';
        if (IsMine) {
            content = '💣';
            className += ' mine';
        } else if (AdjacentMines > 0) {
            content = AdjacentMines;
            className += ` adj-${AdjacentMines}`;
        }
    } else {
        if (FlagState === 1) {
            content = '🚩';
            className += ' flagged';
        }
    }

    return (
        <div
            className={className}
            onClick={onClick}
            onContextMenu={onRightClick}
            role="button"
            tabIndex={0}
            aria-label={IsRevealed ? (IsMine ? 'Mine' : `Cell with ${AdjacentMines} adjacent mines`) : (FlagState === 1 ? 'Flagged cell' : 'Hidden cell')}
        >
            {content}
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison: only re-render if data actually changed
    // Note: onClick/onRightClick are still checked, but data is the primary concern
    return (
        prevProps.data.IsRevealed === nextProps.data.IsRevealed &&
        prevProps.data.IsMine === nextProps.data.IsMine &&
        prevProps.data.AdjacentMines === nextProps.data.AdjacentMines &&
        prevProps.data.FlagState === nextProps.data.FlagState &&
        prevProps.data.FlagOwner === nextProps.data.FlagOwner &&
        prevProps.onClick === nextProps.onClick &&
        prevProps.onRightClick === nextProps.onRightClick
    );
});

Cell.displayName = 'Cell';

export default Cell;
