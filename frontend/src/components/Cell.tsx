import React from 'react';
import './Cell.css';

export interface CellData {
    isRevealed: boolean;
    isMine: boolean;
    adjacentMines: number;
    flagState: number; // 0 = Empty, 1 = Placed
    flagOwnerID?: string;
}

interface CellProps {
    data: CellData;
    onClick: () => void;
    onRightClick: (e: React.MouseEvent) => void;
}

const Cell: React.FC<CellProps> = React.memo(({ data, onClick, onRightClick }) => {
    const { isRevealed, isMine, adjacentMines, flagState } = data;

    let content: string | number = '';
    let className = 'cell';

    if (isRevealed) {
        className += ' revealed';
        if (isMine) {
            content = '💣';
            className += ' mine';
        } else if (adjacentMines > 0) {
            content = adjacentMines;
            className += ` adj-${adjacentMines}`;
        }
    } else {
        if (flagState === 1) {
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
            aria-label={isRevealed ? (isMine ? 'Mine' : `Cell with ${adjacentMines} adjacent mines`) : (flagState === 1 ? 'Flagged cell' : 'Hidden cell')}
        >
            {content}
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison: only re-render if data actually changed
    // Note: onClick/onRightClick are still checked, but data is the primary concern
    return (
        prevProps.data.isRevealed === nextProps.data.isRevealed &&
        prevProps.data.isMine === nextProps.data.isMine &&
        prevProps.data.adjacentMines === nextProps.data.adjacentMines &&
        prevProps.data.flagState === nextProps.data.flagState &&
        prevProps.data.flagOwnerID === nextProps.data.flagOwnerID &&
        prevProps.onClick === nextProps.onClick &&
        prevProps.onRightClick === nextProps.onRightClick
    );
});

Cell.displayName = 'Cell';

export default Cell;
