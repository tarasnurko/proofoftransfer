fn main(x: u64, y: pub u64) -> pub u64 {
    assert(x != y);

    x + y
}

#[test]
fn test_main() {
    main(1, 2);

    // Uncomment to make test fail
    // main(1, 1);
}
