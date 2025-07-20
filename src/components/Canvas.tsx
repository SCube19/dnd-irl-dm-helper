// Canvas.tsx
import React, { useState, useRef, useEffect, useCallback, MouseEventHandler } from 'react';
import '../../global.css';

const Canvas = ({ imageSrc } : any) => {
  // State for the current zoom level of the image
  const [scale, setScale] = useState(1);
  // State for the current position (pan) of the image
  const [position, setPosition] = useState({ x: 0, y: 0 });
  // State to track if the image is currently being dragged
  const [isDragging, setIsDragging] = useState(false);
  // State to store the starting mouse position when a drag begins
  const [startDragPos, setStartDragPos] = useState({ x: 0, y: 0 });
  // Ref to the image container element to get its dimensions and position
  const imageContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Resets the image's zoom and position to its initial state.
   */
  const resetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []); // Memoize resetView as it doesn't depend on any props/state

  // Reset view whenever a new imageSrc is provided
  useEffect(() => {
    resetView();
  }, [imageSrc, resetView]);

  /**
   * Handles the mouse down event on the image container to start dragging.
   * @param {MouseEvent} e - The mouse event.
   */
  const handleMouseDown = (e : React.MouseEvent) => {
    e.preventDefault(); // Prevent default browser drag behavior
    setIsDragging(true); // Set dragging state to true
    setStartDragPos({ x: e.clientX, y: e.clientY }); // Store initial mouse position
  };

  /**
   * Handles the mouse move event to pan the image.
   * Only active when `isDragging` is true.
   * Memoized using useCallback to prevent unnecessary re-renders in useEffect.
   * @param {MouseEvent} e - The mouse event.
   */
  const handleMouseMove = useCallback((e : MouseEvent) => {
    if (!isDragging) 
        return;
    // Calculate the difference in mouse position since the last move
    const dx = e.clientX - startDragPos.x;
    const dy = e.clientY - startDragPos.y;
    // Update the image's position
    setPosition((prevPos) => ({
      x: prevPos.x + dx,
      y: prevPos.y + dy,
    }));
    // Update the starting drag position for the next move to ensure smooth dragging
    setStartDragPos({ x: e.clientX, y: e.clientY });
  }, [isDragging, startDragPos.x, startDragPos.y]); // Dependencies for useCallback

  /**
   * Handles the mouse up event to stop dragging.
   * Memoized using useCallback.
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false); // Set dragging state to false
  }, []); // No dependencies for useCallback

  /**
   * Handles the mouse wheel event to zoom in/out the image.
   * Zooms around the mouse cursor's position.
   * @param {WheelEvent} e - The wheel event.
   */
  const handleWheel = (e : React.WheelEvent) => {
    e.preventDefault(); // Prevent default page scrolling

    const container : HTMLDivElement | null = imageContainerRef.current;
    if (container == null) 
        return;

    const rect = container.getBoundingClientRect(); // Get container's position and size
    const mouseX = e.clientX - rect.left; // Mouse X relative to container
    const mouseY = e.clientY - rect.top; // Mouse Y relative to container

    const zoomAmount = 0.1; // How much to zoom per wheel tick
    const newScale = e.deltaY > 0
      ? Math.max(0.1, scale - zoomAmount) // Zoom out, minimum scale 0.1
      : scale + zoomAmount; // Zoom in

    // Calculate new position to zoom around the cursor
    // This formula ensures the point under the cursor remains stationary after zoom
    const newX = mouseX - ((mouseX - position.x) * (newScale / scale));
    const newY = mouseY - ((mouseY - position.y) * (newScale / scale));

    setScale(newScale);
    setPosition({ x: newX, y: newY });
  };

  // Add and remove event listeners for mouse move and up on the window
  // This ensures dragging continues even if the mouse leaves the image container
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    // Cleanup function to remove listeners when component unmounts or dragging stops
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]); // Dependencies for useEffect

  return (
    <>
      <p className="text-gray-600 text-md text-center">
        Drag to pan, use mouse wheel to zoom.
      </p>
      <div
        ref={imageContainerRef} // Assign ref to this container
        onMouseDown={handleMouseDown} // Start drag on mouse down
        onWheel={handleWheel} // Handle zoom on wheel scroll
        className={`relative w-full max-w-md h-72 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner border border-gray-300 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <img
          src={imageSrc}
          alt="Uploaded"
          className="absolute max-w-full max-h-full object-contain"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0', // Set transform origin to top-left for easier calculation
            willChange: 'transform', // Optimize performance for transformations
          }}
          draggable="false" // Prevent native image dragging
        />
      </div>

    </>
  );
};

export default Canvas;
